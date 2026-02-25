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

const DEFAULT_HEADLINE = "Professional";
const DEFAULT_LOCATION = "Location not set";
const DEFAULT_BIO = "Bio coming soon.";

function toTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getLinkedInProfileSeed(
  profile: Record<string, unknown> | null | undefined,
  user: { image?: string | null },
) {
  const headline =
    toTrimmedString(profile?.headline) ||
    toTrimmedString(profile?.localizedHeadline) ||
    toTrimmedString(profile?.occupation);

  const localeValue = profile?.locale as
    | { country?: string; language?: string }
    | string
    | undefined;
  const location =
    toTrimmedString(profile?.location) ||
    toTrimmedString(
      typeof localeValue === "string" ? localeValue : localeValue?.country,
    );

  const bio =
    toTrimmedString(profile?.summary) || toTrimmedString(profile?.bio);

  const avatarUrl =
    toTrimmedString(user.image) || toTrimmedString(profile?.picture);

  return { headline, location, bio, avatarUrl };
}

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

  return getOAuthFallbackEmail(provider, providerAccountId);
}

async function ensureAppUser(
  user: { email?: string | null; name?: string | null },
  account?: {
    provider?: string | null;
    providerAccountId?: string | null;
  } | null,
  seedProfile?: {
    headline?: string | null;
    location?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
  },
) {
  const normalizedEmail = getAuthEmail(
    user.email,
    account?.provider,
    account?.providerAccountId,
  );

  if (!normalizedEmail) {
    return null;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      headline: true,
      location: true,
      bio: true,
      avatarUrl: true,
    },
  });

  if (!existingByEmail) {
    const baseSource = normalizedEmail.split("@")[0] || user.name || "member";
    const username = await generateUniqueUsername(baseSource);

    return prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        name: user.name?.trim() || username,
        headline: seedProfile?.headline || DEFAULT_HEADLINE,
        location: seedProfile?.location || DEFAULT_LOCATION,
        bio: seedProfile?.bio || DEFAULT_BIO,
        avatarUrl: seedProfile?.avatarUrl || null,
      },
      select: { id: true, username: true, name: true, email: true },
    });
  }

  const updateData: {
    name?: string;
    headline?: string;
    location?: string;
    bio?: string;
    avatarUrl?: string;
  } = {};

  if (user.name?.trim() && user.name.trim() !== existingByEmail.name) {
    updateData.name = user.name.trim();
  }

  if (
    seedProfile?.headline &&
    (existingByEmail.headline === DEFAULT_HEADLINE || !existingByEmail.headline)
  ) {
    updateData.headline = seedProfile.headline;
  }

  if (
    seedProfile?.location &&
    (existingByEmail.location === DEFAULT_LOCATION || !existingByEmail.location)
  ) {
    updateData.location = seedProfile.location;
  }

  if (
    seedProfile?.bio &&
    (existingByEmail.bio === DEFAULT_BIO || !existingByEmail.bio)
  ) {
    updateData.bio = seedProfile.bio;
  }

  if (seedProfile?.avatarUrl && !existingByEmail.avatarUrl) {
    updateData.avatarUrl = seedProfile.avatarUrl;
  }

  if (Object.keys(updateData).length > 0) {
    return prisma.user.update({
      where: { email: normalizedEmail },
      data: updateData,
      select: { id: true, username: true, name: true, email: true },
    });
  }

  return existingByEmail;
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
      profile(profile) {
        const oidcProfile = profile as {
          sub?: string;
          id?: string;
          name?: string;
          email?: string;
          email_verified?: boolean;
          given_name?: string;
          family_name?: string;
          picture?: string;
        };

        const id = oidcProfile.sub || oidcProfile.id;

        if (!id) {
          throw new TypeError(
            "Profile id is missing in LinkedIn OAuth profile response",
          );
        }

        return {
          id,
          name:
            oidcProfile.name ||
            [oidcProfile.given_name, oidcProfile.family_name]
              .filter(Boolean)
              .join(" ") ||
            null,
          email: oidcProfile.email ?? null,
          image: oidcProfile.picture ?? null,
        };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: authSecret,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      const linkedInSeed =
        account?.provider === "linkedin"
          ? getLinkedInProfileSeed(
              (profile as Record<string, unknown> | null | undefined) ?? null,
              user,
            )
          : undefined;

      const persistedUser = await ensureAppUser(user, account, linkedInSeed);

      if (!persistedUser) {
        return false;
      }

      const sessionUser = user as typeof user & {
        appUserId?: string;
        username?: string;
      };

      sessionUser.email = persistedUser.email;
      sessionUser.name = persistedUser.name;
      sessionUser.appUserId = persistedUser.id;
      sessionUser.username = persistedUser.username;

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

      if (account) {
        const persistedUser = await ensureAppUser(
          {
            email:
              sessionUser?.email ||
              (typeof mutableToken.email === "string"
                ? mutableToken.email
                : null),
            name: sessionUser?.name || null,
          },
          account,
        );

        if (persistedUser) {
          mutableToken.appUserId = persistedUser.id;
          mutableToken.username = persistedUser.username;
          mutableToken.email = persistedUser.email;
          mutableToken.name = persistedUser.name;
          return mutableToken;
        }
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
