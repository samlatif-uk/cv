import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateUniqueUsername } from "@/lib/usernames";
import type { Prisma } from "@prisma/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const rawName = body.name?.trim();

  if (!email || !EMAIL_PATTERN.test(email)) {
    return Response.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  if (!password || password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { localAuth: true },
  });

  if (existingUser?.localAuth) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = hashPassword(password);

  if (existingUser) {
    await prisma.localAuth.create({
      data: {
        userId: existingUser.id,
        passwordHash,
      },
    });

    return Response.json({ ok: true }, { status: 201 });
  }

  const baseSource = email.split("@")[0] || rawName || "member";
  const username = await generateUniqueUsername(baseSource);
  const name = rawName || username;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        email,
        username,
        name,
        headline: "Professional",
        location: "Location not set",
        bio: "Bio coming soon.",
      },
      select: { id: true },
    });

    await tx.localAuth.create({
      data: {
        userId: user.id,
        passwordHash,
      },
    });
  });

  return Response.json({ ok: true }, { status: 201 });
}
