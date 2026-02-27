import type { CvData } from "@/lib/cvData";
import { prisma } from "@/lib/prisma";

type CvTechRowRecord = {
  category: string;
  items: string;
  years: string;
};

type CvOverviewStatRecord = {
  value: string;
  label: string;
};

type CvSkillRecord = {
  name: string;
  category: string;
};

type CvJobRecord = {
  id: string;
  company: string;
  date: string;
  title: string;
  description: string;
};

type CvJobBulletRecord = {
  jobId: string;
  content: string;
};

type CvJobStackRecord = {
  jobId: string;
  label: string;
};

type CvEducationRecord = {
  degree: string;
  institution: string;
  period: string;
  grade: string;
  note: string;
};

type RecommendationRecord = {
  recommenderName: string;
  recommenderRole: string;
  relationshipLabel: string;
  recommendationAt: Date | string | null;
  content: string;
  isPublic: boolean;
};

const SPECIAL_PROFILE_EMAIL = "hello@samlatif.uk";

const toNumeric = (value: string) => {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const toIsoDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return "1970-01-01";
  }

  const parsed = value instanceof Date ? value : new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "1970-01-01"
    : parsed.toISOString().slice(0, 10);
};

export type CvProfileIdentity = {
  id: string;
  username: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  bio: string;
  summary: string[];
  avatarUrl: string | null;
};

export type CvProfilePayload = {
  profile: CvProfileIdentity;
  data: CvData;
};

const getRecommendationsByUsername = async (
  username: string,
): Promise<RecommendationRecord[]> => {
  const isSamLatif = username.trim().toLowerCase() === "samlatif";

  return prisma.recommendation.findMany({
    where: {
      recipient: isSamLatif
        ? { OR: [{ username }, { email: SPECIAL_PROFILE_EMAIL }] }
        : { username },
    },
    orderBy: { recommendationAt: "desc" },
    select: {
      recommenderName: true,
      recommenderRole: true,
      relationshipLabel: true,
      recommendationAt: true,
      content: true,
      isPublic: true,
    },
  });
};

export async function getCvProfilePayload(
  username: string,
): Promise<CvProfilePayload | null> {
  const profile = await prisma.user.findUnique({
    where: { username },
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

  if (!profile) {
    return null;
  }

  const recommendations = await getRecommendationsByUsername(username);

  let dbTechRows: CvTechRowRecord[] = [];
  let dbOverviewStats: CvOverviewStatRecord[] = [];
  let dbSkills: CvSkillRecord[] = [];
  let dbJobs: CvJobRecord[] = [];
  let dbJobBullets: CvJobBulletRecord[] = [];
  let dbJobStacks: CvJobStackRecord[] = [];
  let dbEducation: CvEducationRecord[] = [];

  try {
    [
      dbTechRows,
      dbOverviewStats,
      dbSkills,
      dbJobs,
      dbJobBullets,
      dbJobStacks,
      dbEducation,
    ] = await Promise.all([
      prisma.$queryRaw<CvTechRowRecord[]>`
          SELECT category, items, years
          FROM "CvTechRow"
          WHERE "userId" = ${profile.id}
          ORDER BY "sortOrder" ASC
        `,
      prisma.$queryRaw<CvOverviewStatRecord[]>`
          SELECT value, label
          FROM "CvOverviewStat"
          WHERE "userId" = ${profile.id}
          ORDER BY "sortOrder" ASC
        `,
      prisma.$queryRaw<CvSkillRecord[]>`
          SELECT name, category
          FROM "CvSkill"
          WHERE "userId" = ${profile.id}
          ORDER BY "sortOrder" ASC
        `,
      prisma.$queryRaw<CvJobRecord[]>`
          SELECT id, company, date, title, description
          FROM "CvJob"
          WHERE "userId" = ${profile.id}
          ORDER BY "sortOrder" ASC
        `,
      prisma.$queryRaw<CvJobBulletRecord[]>`
          SELECT b."jobId" as "jobId", b.content as content
          FROM "CvJobBullet" b
          INNER JOIN "CvJob" j ON j.id = b."jobId"
          WHERE j."userId" = ${profile.id}
          ORDER BY b."sortOrder" ASC
        `,
      prisma.$queryRaw<CvJobStackRecord[]>`
          SELECT s."jobId" as "jobId", s.label as label
          FROM "CvJobStackItem" s
          INNER JOIN "CvJob" j ON j.id = s."jobId"
          WHERE j."userId" = ${profile.id}
          ORDER BY s."sortOrder" ASC
        `,
      prisma.$queryRaw<CvEducationRecord[]>`
          SELECT degree, institution, period, grade, note
          FROM "CvEducation"
          WHERE "userId" = ${profile.id}
          ORDER BY "sortOrder" ASC
        `,
    ]);
  } catch {
    dbTechRows = [];
    dbOverviewStats = [];
    dbSkills = [];
    dbJobs = [];
    dbJobBullets = [];
    dbJobStacks = [];
    dbEducation = [];
  }

  const techRows =
    dbTechRows.length > 0
      ? dbTechRows.map((row) => ({
          cat: row.category,
          items: row.items,
          yrs: row.years,
        }))
      : [];

  const skills =
    dbSkills.length > 0
      ? dbSkills.map((skill) => ({
          n: skill.name,
          c: skill.category,
        }))
      : [];

  const bulletsByJobId = new Map<string, string[]>();
  dbJobBullets.forEach((bullet) => {
    const existing = bulletsByJobId.get(bullet.jobId) ?? [];
    existing.push(bullet.content);
    bulletsByJobId.set(bullet.jobId, existing);
  });

  const stackByJobId = new Map<string, string[]>();
  dbJobStacks.forEach((stackItem) => {
    const existing = stackByJobId.get(stackItem.jobId) ?? [];
    existing.push(stackItem.label);
    stackByJobId.set(stackItem.jobId, existing);
  });

  const jobs =
    dbJobs.length > 0
      ? dbJobs.map((job) => ({
          co: job.company,
          date: job.date,
          title: job.title,
          desc: job.description,
          bullets: bulletsByJobId.get(job.id) ?? [],
          stack: stackByJobId.get(job.id) ?? [],
        }))
      : [];

  const knownCompanies = jobs
    .map((job) => job.co)
    .sort((first, second) => second.length - first.length);

  const resolveJobCompany = (relationship: string, quote: string) => {
    const haystack = `${relationship} ${quote}`;
    return knownCompanies.find((company) => haystack.includes(company));
  };

  const testimonials = recommendations.map((recommendation) => ({
    by: recommendation.recommenderName,
    role: recommendation.recommenderRole,
    date: toIsoDate(recommendation.recommendationAt),
    jobCompany: resolveJobCompany(
      recommendation.relationshipLabel,
      recommendation.content,
    ),
    relationship: recommendation.relationshipLabel,
    quote: recommendation.content,
    visibility: recommendation.isPublic
      ? ("public" as const)
      : ("private" as const),
  }));

  const inferredYears = techRows.reduce((maxYears, row) => {
    const years = toNumeric(row.yrs);
    return years > maxYears ? years : maxYears;
  }, 0);

  const inferredOverviewStats = [
    {
      value: inferredYears > 0 ? `${inferredYears}+` : `${jobs.length}`,
      label: "Years Experience",
    },
    { value: `${jobs.length}`, label: "Roles Listed" },
    { value: `${skills.length}`, label: "Skills Tagged" },
    {
      value: `${testimonials.filter((item) => item.visibility === "public").length}`,
      label: "Recommendations",
    },
  ];

  const overviewStats =
    dbOverviewStats.length > 0
      ? dbOverviewStats.map((item) => ({
          value: item.value,
          label: item.label,
        }))
      : inferredOverviewStats;

  const education = dbEducation.length > 0 ? dbEducation : [];

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      email: profile.email,
      headline: profile.headline,
      location: profile.location,
      bio: profile.bio,
      summary: [profile.bio],
      avatarUrl: profile.avatarUrl,
    },
    data: {
      OVERVIEW_STATS: overviewStats,
      EDUCATION: education,
      TECH_ROWS: techRows,
      SKILLS: skills,
      DATE_BASED_STACK_DEFAULTS: [],
      GLOBAL_STACK_DEFAULTS: [],
      TESTIMONIALS: testimonials,
      JOBS: jobs,
    },
  };
}
