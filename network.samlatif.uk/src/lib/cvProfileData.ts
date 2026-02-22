import { getSharedCvData, type CvData } from "@/lib/cvData";
import { prisma } from "@/lib/prisma";

type CvTechRowRecord = {
  category: string;
  items: string;
  years: string;
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

export type CvProfileIdentity = {
  id: string;
  username: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  bio: string;
  avatarUrl: string | null;
};

export type CvProfilePayload = {
  profile: CvProfileIdentity;
  data: CvData;
};

export async function getCvProfilePayload(
  username: string,
): Promise<CvProfilePayload | null> {
  const [sharedCvData, profile] = await Promise.all([
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
        recommendations: {
          orderBy: { recommendationAt: "desc" },
          select: {
            recommenderName: true,
            recommenderRole: true,
            relationshipLabel: true,
            recommendationAt: true,
            content: true,
            isPublic: true,
          },
        },
      },
    }),
  ]);

  if (!profile) {
    return null;
  }

  let dbTechRows: CvTechRowRecord[] = [];
  let dbSkills: CvSkillRecord[] = [];
  let dbJobs: CvJobRecord[] = [];
  let dbJobBullets: CvJobBulletRecord[] = [];
  let dbJobStacks: CvJobStackRecord[] = [];

  try {
    [dbTechRows, dbSkills, dbJobs, dbJobBullets, dbJobStacks] =
      await Promise.all([
        prisma.$queryRaw<CvTechRowRecord[]>`
          SELECT category, items, years
          FROM "CvTechRow"
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

  const testimonials = profile.recommendations.map((recommendation) => ({
    by: recommendation.recommenderName,
    role: recommendation.recommenderRole,
    date: recommendation.recommendationAt.toISOString().slice(0, 10),
    relationship: recommendation.relationshipLabel,
    quote: recommendation.content,
    visibility: recommendation.isPublic
      ? ("public" as const)
      : ("private" as const),
  }));

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      email: profile.email,
      headline: profile.headline,
      location: profile.location,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
    },
    data: {
      TECH_ROWS: techRows,
      SKILLS: skills,
      DATE_BASED_STACK_DEFAULTS: sharedCvData.DATE_BASED_STACK_DEFAULTS,
      GLOBAL_STACK_DEFAULTS: sharedCvData.GLOBAL_STACK_DEFAULTS,
      TESTIMONIALS: testimonials,
      JOBS: jobs,
    },
  };
}
