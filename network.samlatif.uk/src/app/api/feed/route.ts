import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          username: true,
          name: true,
          headline: true,
        },
      },
    },
    take: 30,
  });

  return Response.json({ posts });
}
