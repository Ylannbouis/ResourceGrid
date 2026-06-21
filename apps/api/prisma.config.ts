import path from "node:path";
import { defineConfig } from "prisma/config";

// The single source of truth for env vars is apps/api/.env. Load it explicitly by
// absolute path (independent of cwd) so that BOTH the Prisma CLI and the Prisma VS Code
// extension can resolve env("DATABASE_URL"). Without this the extension only looks for a
// .env next to schema.prisma or at the monorepo root, so it misses apps/api/.env and
// flags `Environment variable not found: DATABASE_URL` on the datasource url.
process.loadEnvFile(path.join(__dirname, ".env"));

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});
