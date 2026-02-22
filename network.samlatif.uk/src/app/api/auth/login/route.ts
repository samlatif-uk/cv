import { cookies } from "next/headers";
import { CURRENT_USER_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string };
  const username = body.username?.trim();

  if (!username) {
    return Response.json({ error: "username is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true, name: true },
  });

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_USER_COOKIE, user.username, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ user });
}
