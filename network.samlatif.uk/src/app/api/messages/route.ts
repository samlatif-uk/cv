import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const currentUsername = await getCurrentUsername();

  if (!currentUsername) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (username && username !== currentUsername) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const effectiveUsername = currentUsername;

  const user = await prisma.user.findUnique({
    where: { username: effectiveUsername },
  });

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      members: {
        some: {
          userId: user.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              username: true,
              name: true,
            },
          },
        },
      },
      messages: {
        take: 10,
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              username: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return Response.json({ conversations });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    recipientUsername?: string;
    content?: string;
    conversationId?: string;
  };

  const currentUsername = await getCurrentUsername();
  const recipientUsername = body.recipientUsername?.trim();
  const content = body.content?.trim();

  if (!currentUsername) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (!recipientUsername || !content) {
    return Response.json(
      { error: "recipientUsername and content are required." },
      { status: 400 },
    );
  }

  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { username: currentUsername } }),
    prisma.user.findUnique({ where: { username: recipientUsername } }),
  ]);

  if (!sender || !recipient) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  let conversationId = body.conversationId;

  if (!conversationId) {
    const conversation = await prisma.conversation.create({ data: {} });

    await prisma.conversationMember.createMany({
      data: [
        { conversationId: conversation.id, userId: sender.id },
        { conversationId: conversation.id, userId: recipient.id },
      ],
    });

    conversationId = conversation.id;
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: sender.id,
      content,
    },
    include: {
      sender: {
        select: {
          username: true,
          name: true,
        },
      },
    },
  });

  return Response.json({ message }, { status: 201 });
}
