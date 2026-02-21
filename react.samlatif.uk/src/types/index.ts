export interface TechRow {
  cat: string;
  items: string;
  yrs: string;
}

export interface Skill {
  n: string;
  c: string;
}

export interface Job {
  co: string;
  date: string;
  title: string;
  desc: string;
  bullets: string[];
  stack: string[];
}

export interface Testimonial {
  by: string;
  role: string;
  date: string;
  jobCompany?: string;
  relationship: string;
  quote: string;
  visibility: "public" | "private";
}
