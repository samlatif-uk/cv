import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EducationInput = {
  degree?: string;
  institution?: string;
  period?: string;
  grade?: string;
  note?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const currentUsername = await getCurrentUsername();

  if (currentUsername !== username) {
    return Response.json(
      { error: "You can only edit your own education." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { education?: EducationInput[] };

  if (!Array.isArray(body.education)) {
    return Response.json(
      { error: "education array is required." },
      { status: 400 },
    );
  }

  const parsedEntries = body.education
    .map((entry) => ({
      degree: entry.degree?.trim() ?? "",
      institution: entry.institution?.trim() ?? "",
      period: entry.period?.trim() ?? "",
      grade: entry.grade?.trim() ?? "",
      note: entry.note?.trim() ?? "",
    }))
    .filter(
      (entry) =>
        entry.degree &&
        entry.institution &&
        entry.period &&
        entry.grade &&
        entry.note,
    );

  if (!parsedEntries.length) {
    return Response.json(
      { error: "At least one education entry is required." },
      { status: 400 },
    );
  }

  const profile = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found." }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "CvEducation"
        WHERE "userId" = ${profile.id}
      `;

      for (const [index, entry] of parsedEntries.entries()) {
        await tx.$executeRaw`
          INSERT INTO "CvEducation"
            ("id", "userId", "degree", "institution", "period", "grade", "note", "sortOrder", "createdAt", "updatedAt")
          VALUES
            (${crypto.randomUUID()}, ${profile.id}, ${entry.degree}, ${entry.institution}, ${entry.period}, ${entry.grade}, ${entry.note}, ${index}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("no such table: CvEducation") ||
      message.includes('no such table: "CvEducation"')
    ) {
      return Response.json(
        {
          error:
            "Education storage is not available yet. Run Prisma migrations to add CvEducation.",
        },
        { status: 503 },
      );
    }

    throw error;
  }

  return Response.json({ education: parsedEntries });
}
