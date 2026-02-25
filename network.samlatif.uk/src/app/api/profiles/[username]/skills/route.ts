import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SkillInput = {
  n?: string;
  c?: string;
};

const ALLOWED_CATEGORIES = new Set([
  "core",
  "state",
  "testing",
  "ui",
  "tooling",
  "cms",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const currentUsername = await getCurrentUsername();

  if (currentUsername !== username) {
    return Response.json(
      { error: "You can only edit your own stack at a glance." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { skills?: SkillInput[] };

  if (!Array.isArray(body.skills)) {
    return Response.json(
      { error: "skills array is required." },
      { status: 400 },
    );
  }

  const parsedSkills = body.skills
    .map((skill) => ({
      name: skill.n?.trim() ?? "",
      category: skill.c?.trim().toLowerCase() ?? "",
    }))
    .filter((skill) => skill.name && ALLOWED_CATEGORIES.has(skill.category));

  const profile = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.cvSkill.deleteMany({
      where: { userId: profile.id },
    }),
    ...(parsedSkills.length
      ? [
          prisma.cvSkill.createMany({
            data: parsedSkills.map((skill, index) => ({
              userId: profile.id,
              name: skill.name,
              category: skill.category,
              sortOrder: index,
            })),
          }),
        ]
      : []),
  ]);

  return Response.json({
    skills: parsedSkills.map((skill) => ({
      n: skill.name,
      c: skill.category,
    })),
  });
}
