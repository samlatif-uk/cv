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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;

  const body = (await request.json()) as {
    name?: string;
    headline?: string;
    location?: string;
    bio?: string;
    avatarUrl?: string | null;
  };

  const name = body.name?.trim();
  const headline = body.headline?.trim();
  const location = body.location?.trim();
  const bio = body.bio?.trim();
  const avatarUrl = body.avatarUrl?.trim() || null;

  if (!name || !headline || !location || !bio) {
    return Response.json(
      { error: "name, headline, location, and bio are required." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!existing) {
    return Response.json({ error: "Profile not found." }, { status: 404 });
  }

  const profile = await prisma.user.update({
    where: { username },
    data: {
      name,
      headline,
      location,
      bio,
      avatarUrl,
    },
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

  return Response.json({ profile });
}
