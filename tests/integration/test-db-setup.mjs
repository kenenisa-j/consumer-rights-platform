import pg from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

/**
 * Derives and validates the isolated test database URL.
 * Guarantees tests strictly target consumer_rights_test.
 */
export function getTestDatabaseUrl() {
  const baseDatabaseUrl =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://consumer_rights:REPLACE_WITH_RANDOM_PASSWORD@127.0.0.1:5546/consumer_rights";

  const url = new URL(baseDatabaseUrl);
  url.pathname = "/consumer_rights_test";
  const testUrl = url.toString();

  if (!testUrl.includes("consumer_rights_test")) {
    throw new Error(
      `Safety assertion failed: Database URL does not target consumer_rights_test: ${testUrl}`
    );
  }

  return testUrl;
}

/**
 * Prepares the separate consumer_rights_test database:
 * 1. Creates consumer_rights_test if it does not exist.
 * 2. Applies migrations if tables do not exist.
 * 3. Ensures seed roles and permissions exist for authorization tests.
 */
export async function setupTestDatabase() {
  const testDatabaseUrl = getTestDatabaseUrl();
  const testUrlObj = new URL(testDatabaseUrl);

  // Connect to default DB to ensure consumer_rights_test exists
  const adminUrlObj = new URL(testDatabaseUrl);
  adminUrlObj.pathname = "/consumer_rights";

  let adminClient;
  try {
    adminClient = new Client({ connectionString: adminUrlObj.toString() });
    await adminClient.connect();

    const dbCheck = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'consumer_rights_test'"
    );

    if (dbCheck.rowCount === 0) {
      await adminClient.query("CREATE DATABASE consumer_rights_test");
    }
  } catch (err) {
    throw new Error(
      `Failed to connect to PostgreSQL or create test database: ${String(err)}`
    );
  } finally {
    if (adminClient) {
      await adminClient.end().catch(() => {});
    }
  }

  // Connect to consumer_rights_test
  const testClient = new Client({ connectionString: testDatabaseUrl });
  await testClient.connect();

  try {
    // Check if initial schema is present
    const tableCheck = await testClient.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'users'"
    );

    if (tableCheck.rowCount === 0) {
      const initMigrationSql = await readFile(
        path.join(
          root,
          "backend/prisma/migrations/20261112195102_init/migration.sql"
        ),
        "utf8"
      );
      await testClient.query(initMigrationSql);
    }

    // Check if Better Auth tables are present
    const authTableCheck = await testClient.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions'"
    );

    if (authTableCheck.rowCount === 0) {
      const authMigrationSql = await readFile(
        path.join(
          root,
          "backend/prisma/migrations/20261113150000_add_better_auth/migration.sql"
        ),
        "utf8"
      );
      await testClient.query(authMigrationSql);
    }

    // Seed CONSUMER role and test permission for PermissionGuard
    await testClient.query(`
      INSERT INTO roles (id, code, name, description)
      VALUES ('role-consumer-test-id', 'CONSUMER', 'Consumer', 'Citizen Consumer')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO permissions (id, code, module, action, scope, description)
      VALUES ('perm-complaints-read-test-id', 'complaints:read:own', 'complaints', 'read', 'OWN', 'Read own complaints')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.code = 'CONSUMER' AND p.code = 'complaints:read:own'
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);

    return { testClient, testDatabaseUrl };
  } catch (err) {
    await testClient.end().catch(() => {});
    throw err;
  }
}
