import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl?.startsWith("file:")) {
  console.error("DATABASE_URL ต้องเป็น SQLite file: URL สำหรับ Phase 1 baseline");
  process.exit(1);
}

const configuredPath = databaseUrl.slice("file:".length).split("?")[0];
if (!configuredPath || configuredPath === ":memory:") process.exit(0);

// Prisma resolves a relative SQLite URL from the directory containing schema.prisma.
const databasePath = isAbsolute(configuredPath)
  ? configuredPath
  : resolve(process.cwd(), "prisma", configuredPath);

mkdirSync(dirname(databasePath), { recursive: true });
if (!existsSync(databasePath)) closeSync(openSync(databasePath, "a", 0o600));
