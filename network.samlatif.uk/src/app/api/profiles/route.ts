import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      headline: true,
      location: true,
      bio: true,
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  return Response.json({ users });
}
