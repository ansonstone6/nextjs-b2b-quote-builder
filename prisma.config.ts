import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI only loads `.env` by default. Next.js loads `.env.local` first.
 * Load both so `npx prisma migrate`, `generate`, and `db seed` see `DATABASE_URL`
 * when it lives in `.env.local` only.
 */
loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
});
