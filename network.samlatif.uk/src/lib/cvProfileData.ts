import { getSharedCvData, type CvData } from "@/lib/cvData";
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

const SAM_PROFILE_SUMMARY = [
  "A senior fullstack consultant with 15+ years delivering high-performance, scalable web applications for blue-chip clients — from Goldman Sachs and Bank of America to Visa and Deutsche Bank.",
  "An early adopter of React, with deep expertise spanning every major version from 0.13 to 18, and a track record of bringing it into organisations before it became mainstream.",
  "Strong eye for design and UX, with a habit of dogfooding work personally — features are QA'd before they ship, eliminating the \"chuck it over the fence\" bottleneck and getting polished, production-ready work into users' hands faster.",
  "This CV is intentionally published as both Vanilla JS and React versions to demonstrate the same product thinking and UX decisions across different delivery styles — useful when teams need either framework flexibility or zero-dependency performance.",
];

const DEFAULT_OVERVIEW_STATS = [
  { value: "15+", label: "Years Experience" },
  { value: "25+", label: "Client Engagements" },
  { value: "5", label: "Finance Institutions" },
  { value: "MSc", label: "1st Class BSc" },
];

const toNumeric = (value: string) => {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
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

export async function getCvProfilePayload(
  username: string,
): Promise<CvProfilePayload | null> {
  const [sharedCvData, profile, recommendations] = await Promise.all([
    getSharedCvData(),
    prisma.user.findUnique({
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
    }),
    prisma.recommendation.findMany({
      where: { recipient: { username } },
      orderBy: { recommendationAt: "desc" },
      select: {
        recommenderName: true,
        recommenderRole: true,
        relationshipLabel: true,
        recommendationAt: true,
        content: true,
        isPublic: true,
      },
    }),
  ]);

  if (!profile) {
    return null;
  }

  let dbTechRows: CvTechRowRecord[] = [];
  let dbOverviewStats: CvOverviewStatRecord[] = [];
  let dbSkills: CvSkillRecord[] = [];
  let dbJobs: CvJobRecord[] = [];
  let dbJobBullets: CvJobBulletRecord[] = [];
  let dbJobStacks: CvJobStackRecord[] = [];

  try {
    [dbTechRows, dbOverviewStats, dbSkills, dbJobs, dbJobBullets, dbJobStacks] =
      await Promise.all([
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
      ]);
  } catch {
    dbTechRows = [];
    dbOverviewStats = [];
    dbSkills = [];
    dbJobs = [];
    dbJobBullets = [];
    dbJobStacks = [];
  }

  const techRows =
    dbTechRows.length > 0
      ? dbTechRows.map((row) => ({
          cat: row.category,
          items: row.items,
          yrs: row.years,
        }))
      : sharedCvData.TECH_ROWS;

  const skills =
    dbSkills.length > 0
      ? dbSkills.map((skill) => ({
          n: skill.name,
          c: skill.category,
        }))
      : sharedCvData.SKILLS;

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
      : sharedCvData.JOBS;

  const knownCompanies = jobs
    .map((job) => job.co)
    .sort((first, second) => second.length - first.length);

  const resolveJobCompany = (relationship: string, quote: string) => {
    const haystack = `${relationship} ${quote}`;
    return knownCompanies.find((company) => haystack.includes(company));
  };

  const testimonials =
    profile.username === "samlatif"
      ? sharedCvData.TESTIMONIALS
      : recommendations.map((recommendation) => ({
          by: recommendation.recommenderName,
          role: recommendation.recommenderRole,
          date: recommendation.recommendationAt.toISOString().slice(0, 10),
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
      : profile.username === "samlatif"
        ? sharedCvData.OVERVIEW_STATS && sharedCvData.OVERVIEW_STATS.length
          ? sharedCvData.OVERVIEW_STATS
          : DEFAULT_OVERVIEW_STATS
        : inferredOverviewStats;

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      email: profile.email,
      headline: profile.headline,
      location: profile.location,
      bio: profile.bio,
      summary:
        profile.username === "samlatif" ? SAM_PROFILE_SUMMARY : [profile.bio],
      avatarUrl: profile.avatarUrl,
    },
    data: {
      OVERVIEW_STATS: overviewStats,
      TECH_ROWS: techRows,
      SKILLS: skills,
      DATE_BASED_STACK_DEFAULTS: sharedCvData.DATE_BASED_STACK_DEFAULTS,
      GLOBAL_STACK_DEFAULTS: sharedCvData.GLOBAL_STACK_DEFAULTS,
      TESTIMONIALS: testimonials,
      JOBS: jobs,
    },
  };
}
