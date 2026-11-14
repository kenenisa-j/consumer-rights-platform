/**
 * CORS configuration tests for resolveAllowedCorsOrigins and configureCors
 * (backend/src/main.ts).
 *
 * Two levels of verification:
 *   A. Pure-function tests: import the compiled function from dist and assert
 *      its return values / thrown errors directly. This confirms the decision
 *      logic without duplicating the implementation.
 *   B. HTTP preflight tests: boot a minimal Nest application (no AppModule,
 *      no Prisma, no PostgreSQL) and send OPTIONS requests with an Origin
 *      header; assert the actual Access-Control-Allow-Origin response header.
 *      This confirms the function output is correctly wired via configureCors().
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import coreModule from "@nestjs/core";
import commonModule from "@nestjs/common";

process.env.NODE_ENV = "test";

const NestFactory = coreModule.NestFactory || coreModule.default?.NestFactory;
const Module = commonModule.Module || commonModule.default?.Module;
const Controller = commonModule.Controller || commonModule.default?.Controller;
const Get = commonModule.Get || commonModule.default?.Get;

// ── Shared state ──────────────────────────────────────────────────────────────
let resolveAllowedCorsOrigins;
let configureCors;
let app;
let baseUrl;

before(async () => {
  const mainModule = await import("../backend/dist/main.js");
  resolveAllowedCorsOrigins = mainModule.resolveAllowedCorsOrigins;
  configureCors = mainModule.configureCors;

  if (!resolveAllowedCorsOrigins) throw new Error("resolveAllowedCorsOrigins not exported from dist/main.js");
  if (!configureCors) throw new Error("configureCors not exported from dist/main.js");

  // Minimal NestJS controller and module without AppModule, Prisma, or PostgreSQL
  class MinimalController {
    check() {
      return { status: "pass" };
    }
  }
  Get()(
    MinimalController.prototype,
    "check",
    Object.getOwnPropertyDescriptor(MinimalController.prototype, "check")
  );
  Controller("health")(MinimalController);

  class MinimalModule {}
  Module({ controllers: [MinimalController] })(MinimalModule);

  app = await NestFactory.create(MinimalModule, { logger: false });
  configureCors(app, "http://localhost:3300", "test");
  app.setGlobalPrefix("api");
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (app) await app.close().catch(() => {});
});

// ── A. Pure-function tests ────────────────────────────────────────────────────

test("A1: production rejects http://localhost:3300 as PUBLIC_URL", () => {
  assert.throws(
    () => resolveAllowedCorsOrigins("http://localhost:3300", "production"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("CRITICAL CONFIGURATION ERROR"), `Error: ${err.message}`);
      return true;
    }
  );
});

test("A2: production rejects http://127.0.0.1:3300 as PUBLIC_URL", () => {
  assert.throws(
    () => resolveAllowedCorsOrigins("http://127.0.0.1:3300", "production"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("CRITICAL CONFIGURATION ERROR"), `Error: ${err.message}`);
      return true;
    }
  );
});

test("A3: production accepts a configured trusted public origin", () => {
  const origins = resolveAllowedCorsOrigins("https://consumer.addisababa.gov.et", "production");
  assert.deepEqual(origins, ["https://consumer.addisababa.gov.et"]);
  assert.ok(!origins.includes("http://localhost:3300"), "localhost must not appear in production origins");
  assert.ok(!origins.includes("http://127.0.0.1:3300"), "127.0.0.1 must not appear in production origins");
});

test("A4: development retains localhost origins regardless of PUBLIC_URL", () => {
  const origins = resolveAllowedCorsOrigins("http://localhost:3300", "development");
  assert.ok(origins.includes("http://localhost:3300"), "localhost:3300 must be in development origins");
  assert.ok(origins.includes("http://127.0.0.1:3300"), "127.0.0.1:3300 must be in development origins");
});

test("A5: test environment retains localhost origins", () => {
  const origins = resolveAllowedCorsOrigins("http://localhost:3300", "test");
  assert.ok(origins.includes("http://localhost:3300"), "localhost:3300 must be in test origins");
  assert.ok(origins.includes("http://127.0.0.1:3300"), "127.0.0.1:3300 must be in test origins");
});

// ── B. HTTP preflight tests (actual CORS middleware) ─────────────────────────

/**
 * Sends a CORS preflight OPTIONS request and returns the
 * Access-Control-Allow-Origin header value (or null if absent).
 */
async function preflight(origin) {
  const res = await fetch(`${baseUrl}/api/health`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "GET",
    },
  });
  return res.headers.get("access-control-allow-origin");
}

test("B1: HTTP – localhost:3300 origin is reflected in test/development mode", async () => {
  const acao = await preflight("http://localhost:3300");
  assert.equal(
    acao,
    "http://localhost:3300",
    `Expected Access-Control-Allow-Origin: http://localhost:3300, got: ${acao}`
  );
});

test("B2: HTTP – 127.0.0.1:3300 origin is reflected in test/development mode", async () => {
  const acao = await preflight("http://127.0.0.1:3300");
  assert.equal(
    acao,
    "http://127.0.0.1:3300",
    `Expected Access-Control-Allow-Origin: http://127.0.0.1:3300, got: ${acao}`
  );
});

test("B3: HTTP – an untrusted external origin is not reflected", async () => {
  const acao = await preflight("https://malicious.example.com");
  assert.ok(
    acao !== "https://malicious.example.com" && acao !== "*",
    `Untrusted origin must not be echoed back; got: ${acao}`
  );
});
