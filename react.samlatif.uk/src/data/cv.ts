import sharedCvData from "../../../shared/cv-data.json";
import type { Job, Skill, TechRow } from "../types";

type DateBasedStackDefault = {
  skill: string;
  minStartYear?: number;
  maxStartYear?: number;
};

type SharedCvData = {
  TECH_ROWS: TechRow[];
  SKILLS: Skill[];
  DATE_BASED_STACK_DEFAULTS: DateBasedStackDefault[];
  GLOBAL_STACK_DEFAULTS: string[];
  JOBS: Job[];
};

const CV_DATA = sharedCvData as SharedCvData;

export const TECH_ROWS: TechRow[] = CV_DATA.TECH_ROWS;
export const SKILLS: Skill[] = CV_DATA.SKILLS;
export const DATE_BASED_STACK_DEFAULTS: DateBasedStackDefault[] =
  CV_DATA.DATE_BASED_STACK_DEFAULTS;
export const GLOBAL_STACK_DEFAULTS: string[] = CV_DATA.GLOBAL_STACK_DEFAULTS;
export const JOBS: Job[] = CV_DATA.JOBS;
