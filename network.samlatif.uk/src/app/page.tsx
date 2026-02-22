import { CreatePostForm } from "@/components/CreatePostForm";
import Link from "next/link";
import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentUsername = await getCurrentUsername();

  const [currentUser, posts] = await Promise.all([
    currentUsername
      ? prisma.user.findUnique({
          where: { username: currentUsername },
          select: {
            username: true,
            name: true,
          },
        })
      : Promise.resolve(null),
    prisma.post.findMany({
      include: {
        author: {
          select: {
            username: true,
            name: true,
            headline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <section>
        <div className="cv-kicker text-xs font-semibold uppercase tracking-[0.2em]">
          01 · Craftfolio Feed
        </div>
        <h1 className="cv-title mt-2 text-2xl font-semibold">
          Craftfolio Feed
        </h1>
        <p className="cv-subtitle mt-1 text-sm">
          Share updates, hiring needs, and product progress.
        </p>
      </section>

      {currentUser ? (
        <CreatePostForm currentUser={currentUser} />
      ) : (
        <section className="cv-card rounded-xl p-4">
          <p className="cv-muted text-sm">
            Log in from the nav to create posts.
          </p>
        </section>
      )}

      <section className="space-y-3">
        {posts.length === 0 ? (
          <article className="cv-card rounded-xl p-4">
            <p className="cv-muted text-sm">No posts yet.</p>
          </article>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="cv-card rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/profiles/${post.author.username}`}
                    className="cv-link font-medium"
                  >
                    {post.author.name}
                  </Link>
                  <p className="cv-muted text-sm">
                    <Link
                      href={`/profiles/${post.author.username}`}
                      className="cv-link"
                    >
                      @{post.author.username}
                    </Link>{" "}
                    • {post.author.headline}
                  </p>
                </div>
                <time className="cv-muted text-xs">
                  {post.createdAt.toLocaleDateString()}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-dim)]">
                {post.content}
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
