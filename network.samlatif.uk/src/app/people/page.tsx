import { ConnectButton } from "@/components/ConnectButton";
import Link from "next/link";
import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const currentUsername = await getCurrentUsername();

  const users = await prisma.user.findMany({
    where: currentUsername ? { username: { not: currentUsername } } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      headline: true,
      location: true,
      bio: true,
      _count: {
        select: {
          posts: true,
          sentConnections: true,
          receivedConnections: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <section>
        <div className="cv-kicker text-xs font-semibold uppercase tracking-[0.2em]">
          02 · Craftfolio Network
        </div>
        <h1 className="cv-title mt-2 text-2xl font-semibold">
          Craftfolio Network
        </h1>
        <p className="cv-subtitle mt-1 text-sm">
          Discover professionals and send connection requests.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {users.map((user) => (
          <article key={user.id} className="cv-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/profiles/${user.username}`}
                  className="cv-link font-medium"
                >
                  {user.name}
                </Link>
                <p className="cv-muted text-sm">
                  <Link href={`/profiles/${user.username}`} className="cv-link">
                    @{user.username}
                  </Link>
                </p>
              </div>
              <ConnectButton
                isAuthenticated={Boolean(currentUsername)}
                receiverUsername={user.username}
              />
            </div>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              {user.headline}
            </p>
            <p className="cv-muted mt-1 text-xs">{user.location}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-dim)]">
              {user.bio}
            </p>
            <p className="cv-muted mt-3 text-xs">{user._count.posts} posts</p>
          </article>
        ))}
      </section>
    </main>
  );
}
