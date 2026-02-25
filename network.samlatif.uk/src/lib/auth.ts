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
const linkedInScopeOverride =
  process.env.AUTH_LINKEDIN_SCOPE || process.env.LINKEDIN_SCOPE;
const linkedInExtraScopes =
  process.env.AUTH_LINKEDIN_EXTRA_SCOPES || process.env.LINKEDIN_EXTRA_SCOPES;
const linkedInExperienceApiUrls = (
  process.env.AUTH_LINKEDIN_EXPERIENCE_API_URLS ||
  process.env.LINKEDIN_EXPERIENCE_API_URLS ||
  ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const linkedInImportLoggingEnabled =
  process.env.AUTH_LINKEDIN_IMPORT_LOG === "1" ||
  process.env.LINKEDIN_IMPORT_LOG === "1";
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

function splitScopes(rawValue: string | null | undefined) {
  if (!rawValue?.trim()) {
    return [];
  }

  return rawValue
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildLinkedInScope() {
  if (linkedInScopeOverride?.trim()) {
    return splitScopes(linkedInScopeOverride).join(" ");
  }

  const merged = new Set<string>(["openid", "profile", "email"]);

  for (const scope of splitScopes(linkedInExtraScopes)) {
    merged.add(scope);
  }

  return Array.from(merged).join(" ");
}

const linkedInScope = buildLinkedInScope();

function logLinkedInImport(event: string, details?: Record<string, unknown>) {
  if (!linkedInImportLoggingEnabled) {
    return;
  }

  if (!details) {
    console.info(`[auth][linkedin-import] ${event}`);
    return;
  }

  console.info(`[auth][linkedin-import] ${event}`, details);
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

type SeedJob = {
  company: string;
  date: string;
  title: string;
  description: string;
  bullets: string[];
  stack: string[];
};

function getHeadlineParts(headline: string | null | undefined) {
  const normalized = headline?.trim();
  if (!normalized) {
    return null;
  }

  const splitByAt = normalized.split(/\s+at\s+/i);
  if (splitByAt.length >= 2) {
    const title = splitByAt[0]?.trim();
    const company = splitByAt.slice(1).join(" at ").trim();
    if (title && company) {
      return { title, company };
    }
  }

  return null;
}

function getLinkedInCompanyName(record: Record<string, unknown>) {
  const companyObject =
    record.company && typeof record.company === "object"
      ? (record.company as Record<string, unknown>)
      : null;

  const companyLocalized =
    companyObject?.localizedName || companyObject?.name || companyObject?.urn;

  return (
    toTrimmedString(record.company) ||
    toTrimmedString(record.companyName) ||
    toTrimmedString(record.organization) ||
    toTrimmedString(companyLocalized)
  );
}

function formatLinkedInDateValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return toTrimmedString(value);
  }

  if (typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const year =
    typeof record.year === "number"
      ? record.year
      : Number.parseInt(String(record.year), 10);
  const month =
    typeof record.month === "number"
      ? record.month
      : Number.parseInt(String(record.month), 10);

  if (!Number.isFinite(year)) {
    return null;
  }

  if (Number.isFinite(month) && month >= 1 && month <= 12) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  return String(year);
}

function collectExperienceItems(payload: unknown) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.elements,
    record.items,
    record.data,
    record.positions,
    record.position,
    record.experiences,
    record.experience,
  ];

  const items: unknown[] = [];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      items.push(...candidate);
    }
  }

  if (items.length > 0) {
    return items;
  }

  return [record];
}

function mapLinkedInExperienceItem(item: unknown): SeedJob | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const summaryRecord =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : null;

  const title =
    toTrimmedString(record.title) ||
    toTrimmedString(record.role) ||
    toTrimmedString(record.occupation) ||
    toTrimmedString(record.localizedTitle);
  const company = getLinkedInCompanyName(record);

  if (!title || !company) {
    return null;
  }

  const startDate =
    formatLinkedInDateValue(record.startDate) ||
    formatLinkedInDateValue(record.startedOn) ||
    formatLinkedInDateValue(record.timePeriod);
  const endDate =
    formatLinkedInDateValue(record.endDate) ||
    formatLinkedInDateValue(record.endedOn);
  const date =
    startDate || endDate
      ? `${startDate || "Unknown"} – ${endDate || "Present"}`
      : "LinkedIn";

  const description =
    toTrimmedString(record.description) ||
    toTrimmedString(record.summary) ||
    toTrimmedString(summaryRecord?.text) ||
    "Imported from LinkedIn.";

  return {
    company,
    date,
    title,
    description,
    bullets: [],
    stack: [],
  };
}

async function fetchLinkedInExperienceWithAccessToken(accessToken: string) {
  if (!accessToken || linkedInExperienceApiUrls.length === 0) {
    return {
      jobs: [] as SeedJob[],
      diagnostics: {
        attemptedEndpoints: linkedInExperienceApiUrls.length,
        successfulEndpoints: 0,
        failedEndpoints: linkedInExperienceApiUrls.length,
        reasons: linkedInExperienceApiUrls.length
          ? ["missing_access_token"]
          : ["no_configured_experience_endpoints"],
      },
    };
  }

  const collected: SeedJob[] = [];
  const reasons: string[] = [];
  let successfulEndpoints = 0;
  let failedEndpoints = 0;

  for (const apiUrl of linkedInExperienceApiUrls) {
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        failedEndpoints += 1;
        reasons.push(`http_${response.status}`);
        continue;
      }

      successfulEndpoints += 1;

      const payload = (await response.json()) as unknown;
      for (const item of collectExperienceItems(payload)) {
        const mapped = mapLinkedInExperienceItem(item);
        if (mapped) {
          collected.push(mapped);
        }
      }
    } catch {
      failedEndpoints += 1;
      reasons.push("network_or_parse_error");
      continue;
    }
  }

  if (!collected.length) {
    return {
      jobs: [] as SeedJob[],
      diagnostics: {
        attemptedEndpoints: linkedInExperienceApiUrls.length,
        successfulEndpoints,
        failedEndpoints,
        reasons,
      },
    };
  }

  const seen = new Set<string>();
  const deduped: SeedJob[] = [];

  for (const job of collected) {
    const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}::${job.date.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(job);
    if (deduped.length >= 8) {
      break;
    }
  }

  return {
    jobs: deduped,
    diagnostics: {
      attemptedEndpoints: linkedInExperienceApiUrls.length,
      successfulEndpoints,
      failedEndpoints,
      reasons,
    },
  };
}

function getLinkedInSeedJobs(
  profile: Record<string, unknown> | null | undefined,
  seedProfile: {
    headline?: string | null;
    bio?: string | null;
  },
) {
  const candidates: SeedJob[] = [];

  const experienceSources = [
    profile?.positions,
    profile?.position,
    profile?.experiences,
    profile?.experience,
  ];

  for (const source of experienceSources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const item of source) {
      const mapped = mapLinkedInExperienceItem(item);
      if (mapped) {
        candidates.push(mapped);
      }
    }
  }

  if (candidates.length === 0) {
    const fromHeadline = getHeadlineParts(seedProfile.headline);
    if (fromHeadline) {
      candidates.push({
        company: fromHeadline.company,
        title: fromHeadline.title,
        date: "LinkedIn",
        description: seedProfile.bio || "Imported from LinkedIn.",
        bullets: [],
        stack: [],
      });
    }
  }

  return candidates.slice(0, 8);
}

async function seedJobsIfEmpty(userId: string, jobs: SeedJob[]) {
  if (!jobs.length) {
    return { inserted: 0, skipped: true, reason: "no_jobs_to_seed" } as const;
  }

  const existingCount = await prisma.cvJob.count({ where: { userId } });
  if (existingCount > 0) {
    return {
      inserted: 0,
      skipped: true,
      reason: "existing_jobs_present",
    } as const;
  }

  await prisma.$transaction(async (tx) => {
    for (const [jobIndex, job] of jobs.entries()) {
      const createdJob = await tx.cvJob.create({
        data: {
          userId,
          company: job.company,
          date: job.date,
          title: job.title,
          description: job.description,
          sortOrder: jobIndex,
        },
      });

      if (job.bullets.length) {
        await tx.cvJobBullet.createMany({
          data: job.bullets.map((bullet, bulletIndex) => ({
            jobId: createdJob.id,
            content: bullet,
            sortOrder: bulletIndex,
          })),
        });
      }

      if (job.stack.length) {
        await tx.cvJobStackItem.createMany({
          data: job.stack.map((stackItem, stackIndex) => ({
            jobId: createdJob.id,
            label: stackItem,
            sortOrder: stackIndex,
          })),
        });
      }
    }
  });

  return {
    inserted: jobs.length,
    skipped: false,
    reason: "seeded",
  } as const;
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
          scope: linkedInScope,
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

        const email = oidcProfile.email?.trim().toLowerCase();
        const nameSlug =
          oidcProfile.name
            ?.trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-") || null;

        const id =
          oidcProfile.sub ||
          oidcProfile.id ||
          (email ? `email:${email}` : null) ||
          (nameSlug ? `name:${nameSlug}` : null) ||
          "linkedin:unknown";

        return {
          id,
          name:
            oidcProfile.name ||
            [oidcProfile.given_name, oidcProfile.family_name]
              .filter(Boolean)
              .join(" ") ||
            null,
          email,
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

      if (account?.provider === "linkedin") {
        logLinkedInImport("sign_in_started", {
          userId: persistedUser.id,
          configuredEndpoints: linkedInExperienceApiUrls.length,
          scope: linkedInScope,
        });

        const linkedInAccessToken = toTrimmedString(
          (account as Record<string, unknown> | null | undefined)?.access_token,
        );

        const linkedInApiResult = linkedInAccessToken
          ? await fetchLinkedInExperienceWithAccessToken(linkedInAccessToken)
          : {
              jobs: [] as SeedJob[],
              diagnostics: {
                attemptedEndpoints: linkedInExperienceApiUrls.length,
                successfulEndpoints: 0,
                failedEndpoints: linkedInExperienceApiUrls.length,
                reasons: ["missing_access_token"],
              },
            };

        logLinkedInImport("api_fetch_complete", {
          userId: persistedUser.id,
          importedJobs: linkedInApiResult.jobs.length,
          attemptedEndpoints: linkedInApiResult.diagnostics.attemptedEndpoints,
          successfulEndpoints:
            linkedInApiResult.diagnostics.successfulEndpoints,
          failedEndpoints: linkedInApiResult.diagnostics.failedEndpoints,
          reasons: linkedInApiResult.diagnostics.reasons.slice(0, 5),
        });

        const linkedInJobs =
          linkedInApiResult.jobs.length > 0
            ? linkedInApiResult.jobs
            : getLinkedInSeedJobs(
                (profile as Record<string, unknown> | null | undefined) ?? null,
                {
                  headline: linkedInSeed?.headline,
                  bio: linkedInSeed?.bio,
                },
              );

        if (linkedInApiResult.jobs.length === 0) {
          logLinkedInImport("fallback_profile_claims_used", {
            userId: persistedUser.id,
            fallbackJobs: linkedInJobs.length,
          });
        }

        const seedResult = await seedJobsIfEmpty(
          persistedUser.id,
          linkedInJobs,
        );

        logLinkedInImport("seed_complete", {
          userId: persistedUser.id,
          inserted: seedResult.inserted,
          skipped: seedResult.skipped,
          reason: seedResult.reason,
        });
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
