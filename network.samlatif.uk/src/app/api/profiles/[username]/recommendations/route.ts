import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RecommendationInput = {
  by?: string;
  role?: string;
  date?: string;
  relationship?: string;
  quote?: string;
  visibility?: "public" | "private";
};

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseRecommendationDate = (value: string | undefined) => {
  if (!value) {
    return { value: new Date() } as const;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { value: new Date() } as const;
  }

  if (ISO_DATE_ONLY_PATTERN.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return { value: parsed } as const;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return { value: parsed } as const;
  }

  return { error: `Invalid date: ${value}` } as const;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const currentUsername = await getCurrentUsername();

  if (currentUsername !== username) {
    return Response.json(
      { error: "You can only edit your own recommendations." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    recommendations?: RecommendationInput[];
  };

  if (!Array.isArray(body.recommendations)) {
    return Response.json(
      { error: "recommendations array is required." },
      { status: 400 },
    );
  }

  const parsedRecommendations = [] as Array<{
    by: string;
    role: string;
    date: Date;
    relationship: string;
    quote: string;
    visibility: "public" | "private";
  }>;

  for (const recommendation of body.recommendations) {
    const by = recommendation.by?.trim() ?? "";
    const quote = recommendation.quote?.trim() ?? "";

    if (!by || !quote) {
      continue;
    }

    const dateParse = parseRecommendationDate(recommendation.date);
    if ("error" in dateParse) {
      return Response.json(
        { error: "Recommendation dates must be valid ISO dates or datetimes." },
        { status: 400 },
      );
    }

    parsedRecommendations.push({
      by,
      role: recommendation.role?.trim() || "Colleague",
      date: dateParse.value,
      relationship: recommendation.relationship?.trim() || "Worked together",
      quote,
      visibility:
        recommendation.visibility === "private" ? "private" : "public",
    });
  }

  const profile = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.recommendation.deleteMany({
      where: { recipientId: profile.id },
    });

    if (parsedRecommendations.length) {
      await tx.recommendation.createMany({
        data: parsedRecommendations.map((recommendation) => ({
          recipientId: profile.id,
          recommenderName: recommendation.by,
          recommenderRole: recommendation.role,
          relationshipLabel: recommendation.relationship,
          recommendationAt: recommendation.date,
          content: recommendation.quote,
          isPublic: recommendation.visibility === "public",
        })),
      });
    }
  });

  return Response.json({ recommendations: parsedRecommendations });
}
