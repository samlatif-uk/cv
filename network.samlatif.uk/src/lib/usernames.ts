import { prisma } from "@/lib/prisma";

export function normalizeUsername(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);

  return normalized || "member";
}

export async function generateUniqueUsername(base: string) {
  const normalizedBase = normalizeUsername(base);

  for (let index = 0; index < 20; index += 1) {
    const candidate =
      index === 0 ? normalizedBase : `${normalizedBase}${index + 1}`;
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${normalizedBase}${Date.now().toString().slice(-6)}`;
}
