import sharedCvData from "../../../shared/cv-data.json";
import type { Job, Skill, TechRow, Testimonial } from "../types";

type DateBasedStackDefault = {
  skill: string;
  minStartYear?: number;
  maxStartYear?: number;
};

type SharedCvData = {
  profile?: {
    username: string;
    name: string;
    email: string;
    headline: string;
    location: string;
    bio: string;
    avatarUrl?: string | null;
  };
  TECH_ROWS: TechRow[];
  SKILLS: Skill[];
  DATE_BASED_STACK_DEFAULTS: DateBasedStackDefault[];
  GLOBAL_STACK_DEFAULTS: string[];
  TESTIMONIALS: Testimonial[];
  JOBS: Job[];
};

const CV_DATA = sharedCvData as SharedCvData;

type Profile = {
  username: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  bio: string;
  avatarUrl?: string | null;
};

const DEFAULT_PROFILE: Profile = {
  username: "samlatif",
  name: "Sam Latif",
  email: "hello@samlatif.uk",
  headline: "Senior Fullstack Consultant",
  location: "West London, UK",
  bio: "15+ years delivering high-performance, scalable web applications.",
  avatarUrl: null,
};

export let PROFILE: Profile = CV_DATA.profile ?? DEFAULT_PROFILE;
export let TECH_ROWS: TechRow[] = CV_DATA.TECH_ROWS;
export let SKILLS: Skill[] = CV_DATA.SKILLS;
export let DATE_BASED_STACK_DEFAULTS: DateBasedStackDefault[] =
  CV_DATA.DATE_BASED_STACK_DEFAULTS;
export let GLOBAL_STACK_DEFAULTS: string[] = CV_DATA.GLOBAL_STACK_DEFAULTS;
export let TESTIMONIALS: Testimonial[] = CV_DATA.TESTIMONIALS;
export let JOBS: Job[] = CV_DATA.JOBS;

export async function loadCvDataFromCraftfolio(username = "samlatif") {
  const apiBase =
    import.meta.env.VITE_CRAFTFOLIO_API_BASE ?? "https://network.samlatif.uk";

  try {
    const response = await fetch(`${apiBase}/api/cv/${username}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as SharedCvData;

    PROFILE = data.profile ?? PROFILE;
    TECH_ROWS = data.TECH_ROWS ?? TECH_ROWS;
    SKILLS = data.SKILLS ?? SKILLS;
    DATE_BASED_STACK_DEFAULTS =
      data.DATE_BASED_STACK_DEFAULTS ?? DATE_BASED_STACK_DEFAULTS;
    GLOBAL_STACK_DEFAULTS = data.GLOBAL_STACK_DEFAULTS ?? GLOBAL_STACK_DEFAULTS;
    TESTIMONIALS = data.TESTIMONIALS ?? TESTIMONIALS;
    JOBS = data.JOBS ?? JOBS;
  } catch {
    return;
  }
}
