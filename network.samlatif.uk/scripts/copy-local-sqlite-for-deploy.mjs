import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const sourceDbPath = path.join(projectRoot, "prisma", "dev.db");
const sourceSchemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const targetDir = path.join(projectRoot, ".next", "prisma");
const targetDbPath = path.join(targetDir, "dev.db");
const targetSchemaPath = path.join(targetDir, "schema.prisma");

await stat(sourceDbPath);
await mkdir(targetDir, { recursive: true });
await cp(sourceDbPath, targetDbPath, { force: true });

try {
  await cp(sourceSchemaPath, targetSchemaPath, { force: true });
} catch {
  // Schema copy is best-effort; the SQLite file is the important runtime asset.
}

console.log(`Staged one-off production DB seed at ${targetDbPath}`);
