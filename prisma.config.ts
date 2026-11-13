import { defineConfig, env } from "prisma/config";

// In Node.js >= 20.6.0 (Node 22 engine specified in package.json), process.loadEnvFile()
// is built-in. This loads the local .env file if present without external dependencies like dotenv.
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional when variables are set in the host environment or during static validation.
  }
}

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
