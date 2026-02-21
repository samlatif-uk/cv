import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;

  const profile = await prisma.user.findUnique({
    where: { username },
    include: {
      posts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: {
          posts: true,
          sentConnections: true,
          receivedConnections: true,
        },
      },
    },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found." }, { status: 404 });
  }

  return Response.json({ profile });
}
