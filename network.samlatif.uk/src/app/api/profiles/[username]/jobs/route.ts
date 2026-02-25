import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type JobInput = {
  co?: string;
  date?: string;
  title?: string;
  desc?: string;
  bullets?: string[];
  stack?: string[];
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const currentUsername = await getCurrentUsername();

  if (currentUsername !== username) {
    return Response.json(
      { error: "You can only edit your own job experience." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { jobs?: JobInput[] };

  if (!Array.isArray(body.jobs)) {
    return Response.json({ error: "jobs array is required." }, { status: 400 });
  }

  const parsedJobs = body.jobs
    .map((job) => ({
      co: job.co?.trim() ?? "",
      date: job.date?.trim() ?? "",
      title: job.title?.trim() ?? "",
      desc: job.desc?.trim() ?? "",
      bullets: Array.isArray(job.bullets)
        ? job.bullets.map((bullet) => bullet.trim()).filter(Boolean)
        : [],
      stack: Array.isArray(job.stack)
        ? job.stack.map((item) => item.trim()).filter(Boolean)
        : [],
    }))
    .filter((job) => job.co && job.date && job.title && job.desc);

  const profile = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.cvJob.deleteMany({ where: { userId: profile.id } });

    for (const [jobIndex, job] of parsedJobs.entries()) {
      const createdJob = await tx.cvJob.create({
        data: {
          userId: profile.id,
          company: job.co,
          date: job.date,
          title: job.title,
          description: job.desc,
          sortOrder: jobIndex,
        },
      });

      if (job.bullets.length) {
        await tx.cvJobBullet.createMany({
          data: job.bullets.map((bullet, bulletIndex) => ({
            jobId: createdJob.id,
            content: bullet,
            sortOrder: bulletIndex,
          })),
        });
      }

      if (job.stack.length) {
        await tx.cvJobStackItem.createMany({
          data: job.stack.map((item, stackIndex) => ({
            jobId: createdJob.id,
            label: item,
            sortOrder: stackIndex,
          })),
        });
      }
    }
  });

  return Response.json({ jobs: parsedJobs });
}
