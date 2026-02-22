import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OverviewStatInput = {
  value?: string;
  label?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const currentUsername = await getCurrentUsername();

  if (currentUsername !== username) {
    return Response.json(
      { error: "You can only edit your own overview stats." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    overviewStats?: OverviewStatInput[];
  };

  if (!Array.isArray(body.overviewStats)) {
    return Response.json(
      { error: "overviewStats array is required." },
      { status: 400 },
    );
  }

  const parsedStats = body.overviewStats
    .map((stat) => ({
      value: stat.value?.trim() ?? "",
      label: stat.label?.trim() ?? "",
    }))
    .filter((stat) => stat.value && stat.label)
    .slice(0, 4);

  if (!parsedStats.length) {
    return Response.json(
      { error: "At least one overview stat is required." },
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

  const prismaAny = prisma as any;

  await prismaAny.$transaction([
    prismaAny.cvOverviewStat.deleteMany({
      where: { userId: profile.id },
    }),
    prismaAny.cvOverviewStat.createMany({
      data: parsedStats.map((stat, index) => ({
        userId: profile.id,
        value: stat.value,
        label: stat.label,
        sortOrder: index,
      })),
    }),
  ]);

  return Response.json({ overviewStats: parsedStats });
}
