import type { PrismaClient } from "@prisma/client";

function logRuntimeFailure(scope: string, error: unknown) {
  console.error(`[runtime-safe] ${scope}`, error);
}

export async function getCurrentUsernameSafe() {
  try {
    const { getCurrentUsername } = await import("@/lib/auth");
    return await getCurrentUsername();
  } catch (error) {
    logRuntimeFailure("Failed to load auth module", error);
    return null;
  }
}

export async function getPrismaSafe(): Promise<PrismaClient | null> {
  try {
    const { prisma } = await import("@/lib/prisma");
    return prisma;
  } catch (error) {
    logRuntimeFailure("Failed to load Prisma client", error);
    return null;
  }
}
