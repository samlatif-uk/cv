import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function getBasePathCandidates() {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "network.samlatif.uk"),
  ];
}

function findProjectRoot() {
  const candidates = getBasePathCandidates();

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "prisma", "schema.prisma"))) {
      return candidate;
    }
  }

  return process.cwd();
}

function findBundledOrLocalDbPath() {
  const candidates = getBasePathCandidates().flatMap((candidate) => [
    path.join(candidate, "prisma", "dev.db"),
    path.join(candidate, ".next", "prisma", "dev.db"),
  ]);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function normalizeSqliteDatabaseUrl(rawUrl: string | undefined) {
  const projectRoot = findProjectRoot();
  const defaultDbPath =
    findBundledOrLocalDbPath() ?? path.join(projectRoot, "prisma", "dev.db");

  if (!rawUrl?.trim()) {
    return `file:${defaultDbPath}`;
  }

  if (!rawUrl.startsWith("file:")) {
    return rawUrl;
  }

  const sqlitePath = rawUrl.slice("file:".length);
  if (!sqlitePath || sqlitePath === ":memory:" || path.isAbsolute(sqlitePath)) {
    return rawUrl;
  }

  const normalizedPath = sqlitePath.startsWith("./")
    ? path.join(projectRoot, "prisma", sqlitePath.slice(2))
    : path.join(projectRoot, sqlitePath);

  if (existsSync(normalizedPath)) {
    return `file:${normalizedPath}`;
  }

  return `file:${defaultDbPath}`;
}

process.env.DATABASE_URL = normalizeSqliteDatabaseUrl(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
