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

const toDate = (value: string | undefined) => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
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

  const parsedRecommendations = body.recommendations
    .map((recommendation) => ({
      by: recommendation.by?.trim() ?? "",
      role: recommendation.role?.trim() ?? "",
      date: toDate(recommendation.date?.trim()),
      relationship: recommendation.relationship?.trim() ?? "",
      quote: recommendation.quote?.trim() ?? "",
      visibility:
        recommendation.visibility === "private" ? "private" : "public",
    }))
    .filter((recommendation) => recommendation.by && recommendation.quote)
    .map((recommendation) => ({
      ...recommendation,
      role: recommendation.role || "Colleague",
      relationship: recommendation.relationship || "Worked together",
    }));

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
