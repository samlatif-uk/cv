import { ConnectionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return Response.json({ error: "username is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const [incoming, outgoing, accepted] = await Promise.all([
    prisma.connection.findMany({
      where: { receiverId: user.id, status: ConnectionStatus.PENDING },
      include: { requester: { select: { username: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.connection.findMany({
      where: { requesterId: user.id, status: ConnectionStatus.PENDING },
      include: { receiver: { select: { username: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.connection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [{ requesterId: user.id }, { receiverId: user.id }],
      },
      include: {
        requester: { select: { username: true, name: true } },
        receiver: { select: { username: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return Response.json({ incoming, outgoing, accepted });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    requesterUsername?: string;
    receiverUsername?: string;
  };

  const requesterUsername = body.requesterUsername?.trim();
  const receiverUsername = body.receiverUsername?.trim();

  if (!requesterUsername || !receiverUsername) {
    return Response.json(
      { error: "requesterUsername and receiverUsername are required." },
      { status: 400 },
    );
  }

  if (requesterUsername === receiverUsername) {
    return Response.json(
      { error: "Cannot connect to yourself." },
      { status: 400 },
    );
  }

  const [requester, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { username: requesterUsername } }),
    prisma.user.findUnique({ where: { username: receiverUsername } }),
  ]);

  if (!requester || !receiver) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: requester.id, receiverId: receiver.id },
        { requesterId: receiver.id, receiverId: requester.id },
      ],
    },
  });

  if (existing) {
    return Response.json({ connection: existing, existing: true });
  }

  const connection = await prisma.connection.create({
    data: {
      requesterId: requester.id,
      receiverId: receiver.id,
      status: ConnectionStatus.PENDING,
    },
  });

  return Response.json({ connection }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    connectionId?: string;
    status?: "ACCEPTED" | "DECLINED";
  };

  if (!body.connectionId || !body.status) {
    return Response.json(
      { error: "connectionId and status are required." },
      { status: 400 },
    );
  }

  const connection = await prisma.connection.update({
    where: { id: body.connectionId },
    data: { status: body.status },
  });

  return Response.json({ connection });
}
