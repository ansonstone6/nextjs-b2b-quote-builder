import path from "node:path";
import { config as loadEnv } from "dotenv";

/** Same rules as `prisma.config.ts`: CLI loads `.env` + `.env.local`; `tsx prisma/seed.ts` does not. */
loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });
