import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    authorUsername?: string;
    content?: string;
  };

  const authorUsername = body.authorUsername?.trim();
  const content = body.content?.trim();

  if (!authorUsername || !content) {
    return Response.json(
      { error: "authorUsername and content are required." },
      { status: 400 },
    );
  }

  const author = await prisma.user.findUnique({
    where: { username: authorUsername },
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
