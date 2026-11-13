/**
 * CORS configuration tests for resolveAllowedCorsOrigins (backend/src/main.ts).
 *
 * Two levels of verification:
 *   A. Pure-function tests: import the compiled function from dist and assert
 *      its return values / thrown errors directly. This confirms the decision
 *      logic without duplicating the implementation.
 *   B. HTTP preflight tests: boot a real Nest application and send OPTIONS
 *      requests with an Origin header; assert the actual
 *      Access-Control-Allow-Origin response header. This confirms the function
 *      output is correctly wired into app.enableCors().
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestDatabase } from "./integration/test-db-setup.mjs";

process.env.NODE_ENV = "test";

// ── Shared state for HTTP tests ───────────────────────────────────────────────
let resolveAllowedCorsOrigins;
let createNestApp;
let app;
let baseUrl;
let testClient;

before(async () => {
  const dbSetup = await setupTestDatabase();
  testClient = dbSetup.testClient;
  process.env.DATABASE_URL = dbSetup.testDatabaseUrl;
  process.env.NODE_ENV = "test";

  const mainModule = await import("../backend/dist/main.js");
  resolveAllowedCorsOrigins = mainModule.resolveAllowedCorsOrigins;
  createNestApp = mainModule.createNestApp;

  if (!resolveAllowedCorsOrigins) throw new Error("resolveAllowedCorsOrigins not exported from dist/main.js");
  if (!createNestApp) throw new Error("createNestApp not exported from dist/main.js");

  app = await createNestApp();
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (testClient) await testClient.end().catch(() => {});
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
