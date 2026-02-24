import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { generateUniqueUsername } from "@/lib/usernames";

const googleClientId =
  process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const linkedInClientId =
  process.env.AUTH_LINKEDIN_ID || process.env.LINKEDIN_CLIENT_ID;
const linkedInClientSecret =
  process.env.AUTH_LINKEDIN_SECRET || process.env.LINKEDIN_CLIENT_SECRET;
const authSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.AUTHJS_SECRET;

function getOAuthFallbackEmail(
  provider?: string | null,
  providerAccountId?: string | null,
) {
  if (!provider || !providerAccountId) {
    return null;
  }

  const providerSlug = provider
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const accountSlug = providerAccountId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  if (!providerSlug || !accountSlug) {
    return null;
  }

  return `${providerSlug}-${accountSlug}@oauth.local`;
}

function getAuthEmail(
  userEmail?: string | null,
  provider?: string | null,
  providerAccountId?: string | null,
) {
  const normalizedUserEmail = userEmail?.trim().toLowerCase();

  if (normalizedUserEmail) {
    return normalizedUserEmail;
  }

  if (provider === "linkedin") {
    return null;
  }

  return getOAuthFallbackEmail(provider, providerAccountId);
}

const providers = [];

providers.push(
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;

      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { localAuth: true },
      });

      if (!user?.localAuth) {
        return null;
      }

      const passwordMatches = verifyPassword(
        password,
        user.localAuth.passwordHash,
      );

      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  }),
);

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  );
}

if (linkedInClientId && linkedInClientSecret) {
  providers.push(
    LinkedInProvider({
      clientId: linkedInClientId,
      clientSecret: linkedInClientSecret,
      wellKnown:
        "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: authSecret,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      const normalizedEmail = getAuthEmail(
        user.email,
        account?.provider,
        account?.providerAccountId,
      );

      if (!normalizedEmail) {
        return false;
      }

      const existingByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, username: true, name: true, email: true },
      });

      let persistedUser = existingByEmail;

      if (!existingByEmail) {
        const baseSource =
          normalizedEmail.split("@")[0] || user.name || "member";
        const username = await generateUniqueUsername(baseSource);

        persistedUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            username,
            name: user.name?.trim() || username,
            headline: "Professional",
            location: "Location not set",
            bio: "Bio coming soon.",
          },
          select: { id: true, username: true, name: true, email: true },
        });
      } else if (user.name?.trim()) {
        persistedUser = await prisma.user.update({
          where: { email: normalizedEmail },
          data: {
            name: user.name.trim(),
          },
          select: { id: true, username: true, name: true, email: true },
        });
      }

      const sessionUser = user as typeof user & {
        appUserId?: string;
        username?: string;
      };

      if (persistedUser) {
        sessionUser.email = persistedUser.email;
        sessionUser.name = persistedUser.name;
        sessionUser.appUserId = persistedUser.id;
        sessionUser.username = persistedUser.username;
      } else {
        sessionUser.email = normalizedEmail;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      const sessionUser = user as
        | (typeof user & {
            appUserId?: string;
            username?: string;
          })
        | undefined;
      const mutableToken = token as typeof token & {
        appUserId?: string;
        username?: string;
      };

      if (sessionUser?.appUserId) {
        mutableToken.appUserId = sessionUser.appUserId;
      }

      if (sessionUser?.username) {
        mutableToken.username = sessionUser.username;
      }

      if (!mutableToken.email) {
        mutableToken.email = getAuthEmail(
          user?.email,
          account?.provider,
          account?.providerAccountId,
        );
      }

      if (mutableToken.username) {
        return mutableToken;
      }

      const profile = await prisma.user.findFirst({
        where: mutableToken.appUserId
          ? { id: mutableToken.appUserId }
          : mutableToken.email
            ? { email: mutableToken.email }
            : undefined,
        select: { username: true, name: true },
      });

      if (profile) {
        mutableToken.username = profile.username;
        mutableToken.name = profile.name;
      }

      return mutableToken;
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
