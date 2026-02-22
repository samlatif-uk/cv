import { readFile } from "node:fs/promises";
import path from "node:path";

export type TechRow = {
  cat: string;
  items: string;
  yrs: string;
};

export type Skill = {
  n: string;
  c: string;
};

export type Job = {
  co: string;
  date: string;
  title: string;
  desc: string;
  bullets: string[];
  stack: string[];
};

export type DateBasedStackDefault = {
  skill: string;
  minStartYear?: number;
  maxStartYear?: number;
};

export type OverviewStat = {
  value: string;
  label: string;
};

export type EducationEntry = {
  degree: string;
  institution: string;
  period: string;
  grade: string;
  note: string;
};

export type CvData = {
  OVERVIEW_STATS?: OverviewStat[];
  EDUCATION?: EducationEntry[];
  TECH_ROWS: TechRow[];
  SKILLS: Skill[];
  DATE_BASED_STACK_DEFAULTS: DateBasedStackDefault[];
  GLOBAL_STACK_DEFAULTS: string[];
  TESTIMONIALS: {
    by: string;
    role: string;
    date: string;
    jobCompany?: string;
    relationship: string;
    quote: string;
    visibility: "public" | "private";
  }[];
  JOBS: Job[];
};

let cachedData: CvData | null = null;

export async function getSharedCvData(): Promise<CvData> {
  if (cachedData) {
    return cachedData;
  }

  const filePath = path.join(process.cwd(), "..", "shared", "cv-data.json");
  const fileContent = await readFile(filePath, "utf-8");
  cachedData = JSON.parse(fileContent) as CvData;

  return cachedData;
}
