import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { prisma } from "@/lib/prisma";

function normalizeUsername(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);

  return normalized || "member";
}

async function generateUniqueUsername(base: string) {
  const normalizedBase = normalizeUsername(base);

  for (let index = 0; index < 20; index += 1) {
    const candidate =
      index === 0 ? normalizedBase : `${normalizedBase}${index + 1}`;
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${normalizedBase}${Date.now().toString().slice(-6)}`;
}

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET) {
  providers.push(
    LinkedInProvider({
      clientId: process.env.AUTH_LINKEDIN_ID,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET,
    }),
  );
}

if (providers.length === 0) {
  providers.push(
    CredentialsProvider({
      name: "Disabled",
      credentials: {},
      async authorize() {
        return null;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const existingByEmail = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, username: true },
      });

      if (!existingByEmail) {
        const baseSource = user.email.split("@")[0] || user.name || "member";
        const username = await generateUniqueUsername(baseSource);

        await prisma.user.create({
          data: {
            email: user.email,
            username,
            name: user.name?.trim() || username,
            headline: "Professional",
            location: "Location not set",
            bio: "Bio coming soon.",
          },
        });
      }

      return true;
    },
    async jwt({ token }) {
      if (!token.email) {
        return token;
      }

      const profile = await prisma.user.findUnique({
        where: { email: token.email },
        select: { username: true, name: true },
      });

      if (profile) {
        token.username = profile.username;
        token.name = profile.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.email =
          typeof token.email === "string" ? token.email : null;
        (session.user as { username?: string }).username =
          typeof token.username === "string" ? token.username : undefined;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
};

export async function getCurrentUsername() {
  const session = await getServerSession(authOptions);
  return (session?.user as { username?: string } | undefined)?.username ?? null;
}
