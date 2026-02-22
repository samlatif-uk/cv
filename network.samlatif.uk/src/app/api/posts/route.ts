import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    content?: string;
  };

  const currentUsername = await getCurrentUsername();
  const content = body.content?.trim();

  if (!currentUsername) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (!content) {
    return Response.json({ error: "content is required." }, { status: 400 });
  }

  const author = await prisma.user.findUnique({
    where: { username: currentUsername },
    select: { id: true },
  });

  if (!author) {
    return Response.json({ error: "Author not found." }, { status: 404 });
  }

  const post = await prisma.post.create({
    data: {
      content,
      authorId: author.id,
    },
    include: {
      author: {
        select: {
          username: true,
          name: true,
          headline: true,
        },
      },
    },
  });

  return Response.json({ post }, { status: 201 });
}
