import { getCvProfilePayload } from "@/lib/cvProfileData";

const ALLOWED_ORIGINS = new Set([
  "https://samlatif.uk",
  "https://react.samlatif.uk",
  "https://network.samlatif.uk",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;

  const payload = await getCvProfilePayload(username);

  if (!payload) {
    return Response.json(
      { error: "Profile not found." },
      { status: 404, headers: corsHeaders(request) },
    );
  }

  return Response.json(
    {
      profile: {
        username: payload.profile.username,
        name: payload.profile.name,
        email: payload.profile.email,
        headline: payload.profile.headline,
        location: payload.profile.location,
        bio: payload.profile.bio,
        summary: payload.profile.summary,
        avatarUrl: payload.profile.avatarUrl,
      },
      OVERVIEW_STATS: payload.data.OVERVIEW_STATS,
      EDUCATION: payload.data.EDUCATION,
      TECH_ROWS: payload.data.TECH_ROWS,
      SKILLS: payload.data.SKILLS,
      DATE_BASED_STACK_DEFAULTS: payload.data.DATE_BASED_STACK_DEFAULTS,
      GLOBAL_STACK_DEFAULTS: payload.data.GLOBAL_STACK_DEFAULTS,
      TESTIMONIALS: payload.data.TESTIMONIALS,
      JOBS: payload.data.JOBS,
    },
    { headers: corsHeaders(request) },
  );
}
