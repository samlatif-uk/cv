import sharedCvData from "../../../shared/cv-data.json";
import type { CvData } from "@/lib/cvData";
import type { CvProfilePayload } from "@/lib/cvProfileData";

type SharedCvDataWithProfile = CvData & {
  profile?: {
    username: string;
    name: string;
    email: string;
    headline: string;
    location: string;
    bio: string;
    avatarUrl?: string | null;
  };
};

const FALLBACK_CV_DATA = sharedCvData as SharedCvDataWithProfile;

const DEFAULT_PROFILE = {
  username: "samlatif",
  name: "Sam Latif",
  email: "hello@samlatif.uk",
  headline: "Senior Fullstack Consultant",
  location: "West London, UK",
  bio: "A senior fullstack consultant with 15+ years delivering high-performance, scalable web applications for blue-chip clients — from Goldman Sachs and Bank of America to Visa and Deutsche Bank.",
  avatarUrl: null,
};

export function getFallbackCvProfilePayload(
  username: string,
): CvProfilePayload | null {
  const normalizedUsername = username.trim().toLowerCase();
  const profile = FALLBACK_CV_DATA.profile ?? DEFAULT_PROFILE;

  if (normalizedUsername !== profile.username.toLowerCase()) {
    return null;
  }

  return {
    profile: {
      id: `fallback:${profile.username}`,
      username: profile.username,
      name: profile.name,
      email: profile.email,
      headline: profile.headline,
      location: profile.location,
      bio: profile.bio,
      summary: [profile.bio],
      avatarUrl: profile.avatarUrl ?? null,
    },
    data: FALLBACK_CV_DATA,
  };
}
