import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ------------------------------------------------------------------------------
// 1. Backend Structure & File Existence
// ------------------------------------------------------------------------------
test("backend foundation files exist and are well-formed", () => {
  const requiredFiles = [
    "backend/package.json",
    "backend/tsconfig.json",
    "backend/tsconfig.build.json",
    "backend/nest-cli.json",
    "backend/src/main.ts",
    "backend/src/app.module.ts",
    "backend/src/lib/config/env.validation.ts",
    "backend/src/lib/config/config.module.ts",
    "backend/src/lib/database/prisma.service.ts",
    "backend/src/lib/database/prisma.module.ts",
    "backend/src/lib/common/decorators/public.decorator.ts",
    "backend/src/lib/common/decorators/require-permission.decorator.ts",
    "backend/src/lib/common/guards/permission.guard.ts",
    "backend/src/lib/common/filters/all-exceptions.filter.ts",
    "backend/src/lib/common/interceptors/transform.interceptor.ts",
    "backend/src/lib/health/health.controller.ts",
    "backend/src/lib/health/health.module.ts",
    "scripts/verify-db-connection.mjs"
  ];

  for (const relPath of requiredFiles) {
    const fullPath = resolve(relPath);
    assert.ok(existsSync(fullPath), `Missing required backend file: ${relPath}`);
    const content = readFileSync(fullPath, "utf8");
    assert.ok(content.trim().length > 0, `File must not be empty: ${relPath}`);
  }
});

// ------------------------------------------------------------------------------
// 2. Package & TypeScript Configuration
// ------------------------------------------------------------------------------
test("backend package.json and tsconfig declare valid workspace standards", () => {
  const pkg = JSON.parse(readFileSync(resolve("backend/package.json"), "utf8"));
  assert.equal(pkg.name, "@consumer-rights/backend");
  assert.equal(pkg.private, true);
  assert.ok(pkg.dependencies["@nestjs/core"]);
  assert.ok(pkg.dependencies["@nestjs/common"]);
  assert.ok(pkg.dependencies["@nestjs/config"]);
  assert.ok(pkg.dependencies["@consumer-rights/contracts"]);
  assert.ok(pkg.dependencies["@prisma/client"]);
  assert.ok(pkg.dependencies["@prisma/adapter-pg"]);
  assert.ok(pkg.dependencies["pg"]);
  assert.ok(pkg.devDependencies["typescript"]);
  assert.ok(pkg.devDependencies["@nestjs/cli"]);
  assert.ok(pkg.devDependencies["prisma"]);

  const tsconfig = JSON.parse(readFileSync(resolve("backend/tsconfig.json"), "utf8"));
  assert.equal(tsconfig.compilerOptions.strict, true);
  assert.equal(tsconfig.compilerOptions.emitDecoratorMetadata, true);
  assert.equal(tsconfig.compilerOptions.experimentalDecorators, true);
});

// ------------------------------------------------------------------------------
// 3. Environment Validation Rules
// ------------------------------------------------------------------------------
test("env.validation.ts defines default ports and production requirements", () => {
  const content = readFileSync(resolve("backend/src/lib/config/env.validation.ts"), "utf8");
  assert.match(content, /export function validateEnvironment/);
  assert.match(content, /API_PORT/);
  assert.match(content, /4300/);
  assert.match(content, /127\.0\.0\.1/);
  assert.match(content, /DATABASE_URL is required in production/);
  assert.match(content, /BETTER_AUTH_SECRET must be at least 32 characters/);
});

// ------------------------------------------------------------------------------
// 4. Application Bootstrap & Routing Standards
// ------------------------------------------------------------------------------
test("main.ts configures api prefix, security headers, CORS, and validation pipe", () => {
  const content = readFileSync(resolve("backend/src/main.ts"), "utf8");
  assert.match(content, /app\.setGlobalPrefix\(['"]api['"]\)/);
  assert.match(content, /helmet\(\)/);
  assert.match(content, /app\.enableCors\(/);
  assert.match(content, /new ValidationPipe\(/);
  assert.match(content, /app\.enableShutdownHooks\(\)/);
  assert.match(content, /API_PORT/);
});

// ------------------------------------------------------------------------------
// 5. Common Authorization & Guards
// ------------------------------------------------------------------------------
test("permission guard implements fail-closed authorization and metadata checks", () => {
  const publicDec = readFileSync(resolve("backend/src/lib/common/decorators/public.decorator.ts"), "utf8");
  assert.match(publicDec, /export const IS_PUBLIC_KEY = ['"]isPublic['"]/);

  const permDec = readFileSync(resolve("backend/src/lib/common/decorators/require-permission.decorator.ts"), "utf8");
  assert.match(permDec, /export const PERMISSIONS_KEY = ['"]permissions['"]/);

  const guard = readFileSync(resolve("backend/src/lib/common/guards/permission.guard.ts"), "utf8");
  assert.match(guard, /export class PermissionGuard implements CanActivate/);
  assert.match(guard, /IS_PUBLIC_KEY/);
  assert.match(guard, /PERMISSIONS_KEY/);
  assert.match(guard, /throw new ForbiddenException/);
});

// ------------------------------------------------------------------------------
// 6. Contracts Compliance: Health Endpoint & Envelope Structure
// ------------------------------------------------------------------------------
test("health controller and global filters adhere to ApiResponse contracts", () => {
  const healthContent = readFileSync(resolve("backend/src/lib/health/health.controller.ts"), "utf8");
  assert.match(healthContent, /@Controller\(['"]health['"]\)/);
  assert.match(healthContent, /@Public\(\)/);
  assert.match(healthContent, /@Get\(\)/);
  assert.match(healthContent, /status:\s*isDbConnected\s*\?\s*['"]pass['"]\s*:\s*['"]fail['"]/);
  assert.match(healthContent, /database:\s*isDbConnected\s*\?\s*['"]connected['"]\s*:\s*['"]disconnected['"]/);

  // Policy symmetry (scripts/validate.mjs compliance)
  const routes = (healthContent.match(/@(Get|Post|Patch|Put|Delete)\(/g) || []).length;
  const policies = (healthContent.match(/@(Public|RequirePermission)\(/g) || []).length;
  assert.ok(routes > 0);
  assert.equal(routes, policies, "Routes and policies must match 1:1");

  const filter = readFileSync(resolve("backend/src/lib/common/filters/all-exceptions.filter.ts"), "utf8");
  assert.match(filter, /ApiFailure/);
  assert.match(filter, /ok:\s*false/);

  const interceptor = readFileSync(resolve("backend/src/lib/common/interceptors/transform.interceptor.ts"), "utf8");
  assert.match(interceptor, /ApiSuccess/);
  assert.match(interceptor, /ok:\s*true/);
});

// ------------------------------------------------------------------------------
// 7. Prisma 7 + PostgreSQL Adapter Integration
// ------------------------------------------------------------------------------
test("prisma service and module configure driver adapter and lifecycle hooks", () => {
  const serviceContent = readFileSync(resolve("backend/src/lib/database/prisma.service.ts"), "utf8");
  assert.match(serviceContent, /class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy/);
  assert.match(serviceContent, /from ['"]@prisma\/adapter-pg['"]/);
  assert.match(serviceContent, /from ['"]pg['"]/);
  assert.match(serviceContent, /new PrismaPg\(/);
  assert.match(serviceContent, /async onModuleInit\(\)/);
  assert.match(serviceContent, /async onModuleDestroy\(\)/);
  assert.match(serviceContent, /async ping\(\): Promise<boolean>/);
  assert.match(serviceContent, /sanitizeMessage/);

  const moduleContent = readFileSync(resolve("backend/src/lib/database/prisma.module.ts"), "utf8");
  assert.match(moduleContent, /@Global\(\)/);
  assert.match(moduleContent, /class PrismaModule/);
  assert.match(moduleContent, /exports:\s*\[PrismaService\]/);

  const appModuleContent = readFileSync(resolve("backend/src/app.module.ts"), "utf8");
  assert.match(appModuleContent, /PrismaModule/);
});


// ------------------------------------------------------------------------------
// 8. Initial Migration SQL Custom Integrity Constraints
// ------------------------------------------------------------------------------
test("initial migration SQL includes custom dual-routing check, partial indexes, and reference trigger", () => {
  const migrationPath = resolve("backend/prisma/migrations/20261112195102_init/migration.sql");
  assert.ok(existsSync(migrationPath), "Migration SQL file must exist");
  const sql = readFileSync(migrationPath, "utf8");

  // Dual-routing CHECK constraint
  assert.match(sql, /chk_case_dual_routing/);
  assert.match(sql, /route\s*=\s*'DIRECT_GOVERNMENT'/);
  assert.match(sql, /route\s*=\s*'REGISTERED_BUSINESS'/);
  assert.match(sql, /escalated_to_gov_at IS NULL/);

  // Four partial unique indexes
  assert.match(sql, /CREATE UNIQUE INDEX "idx_user_single_active_office"\s+ON "user_offices"\s*\("user_id"\)\s+WHERE "is_active" = TRUE;/);
  assert.match(sql, /CREATE UNIQUE INDEX "idx_case_single_active_assignment"\s+ON "case_assignments"\s*\("case_id"\)\s+WHERE "is_active" = TRUE;/);
  assert.match(sql, /CREATE UNIQUE INDEX "idx_case_single_pending_transfer"\s+ON "case_transfers"\s*\("case_id"\)\s+WHERE "status" = 'PENDING_ACCEPTANCE';/);
  assert.match(sql, /CREATE UNIQUE INDEX "idx_case_single_merchant_negotiation"\s+ON "conversations"\s*\("case_id"\)\s+WHERE "kind" = 'CONSUMER_BUSINESS';/);

  // Annual reference sequence trigger & function
  assert.match(sql, /FUNCTION generate_case_reference\(\)/);
  assert.match(sql, /Africa\/Addis_Ababa/);
  assert.match(sql, /INSERT INTO "annual_case_sequences"/);
  assert.match(sql, /ON CONFLICT \("year"\) DO UPDATE/);
  assert.match(sql, /IF v_seq > 99999 THEN/);
  assert.match(sql, /'CC-' \|\| v_year \|\| '-' \|\| LPAD\(v_seq::TEXT, 5, '0'\)/);
  assert.match(sql, /TRIGGER trg_generate_case_reference/);
  assert.match(sql, /WHEN \(NEW\."reference_number" IS NULL OR NEW\."reference_number" = ''\)/);
});
