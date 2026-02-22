import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TechRowInput = {
  cat?: string;
  items?: string;
  yrs?: string;
};

const normalizeYearValue = (value: string) => {
  const match = value.match(/\d+/);
  return match ? match[0] : "";
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const currentUsername = await getCurrentUsername();

  if (currentUsername !== username) {
    return Response.json(
      { error: "You can only edit your own tech skills." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { techRows?: TechRowInput[] };

  if (!Array.isArray(body.techRows)) {
    return Response.json(
      { error: "techRows array is required." },
      { status: 400 },
    );
  }

  const parsedRows = body.techRows
    .map((row) => ({
      category: row.cat?.trim() ?? "",
      items: row.items?.trim() ?? "",
      years: normalizeYearValue(row.yrs?.trim() ?? ""),
    }))
    .filter((row) => row.category && row.items && row.years);

  if (!parsedRows.length) {
    return Response.json(
      { error: "At least one valid tech skills row is required." },
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

  await prisma.$transaction([
    prisma.cvTechRow.deleteMany({
      where: { userId: profile.id },
    }),
    prisma.cvTechRow.createMany({
      data: parsedRows.map((row, index) => ({
        userId: profile.id,
        category: row.category,
        items: row.items,
        years: row.years,
        sortOrder: index,
      })),
    }),
  ]);

  return Response.json({ techRows: parsedRows });
}