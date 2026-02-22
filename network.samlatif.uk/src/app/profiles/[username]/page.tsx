import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionStatus } from "@prisma/client";
import { ProfileEditorForm } from "@/components/ProfileEditorForm";
import { prisma } from "@/lib/prisma";

function renderName(name: string) {
  const parts = name.trim().split(" ");

  if (parts.length < 2) {
    return name;
  }

  const first = parts.slice(0, -1).join(" ");
  const last = parts[parts.length - 1];

  return (
    <>
      {first} <span className="text-zinc-500">{last}</span>
    </>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await prisma.user.findUnique({
    where: { username },
    include: {
      posts: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  const [acceptedConnections, pendingIncoming, pendingOutgoing] =
    await Promise.all([
      prisma.connection.findMany({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [{ requesterId: profile.id }, { receiverId: profile.id }],
        },
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.connection.count({
        where: { receiverId: profile.id, status: ConnectionStatus.PENDING },
      }),
      prisma.connection.count({
        where: { requesterId: profile.id, status: ConnectionStatus.PENDING },
      }),
    ]);

  const connections = acceptedConnections.map((connection) => {
    if (connection.requesterId === profile.id) {
      return connection.receiver;
    }

    return connection.requester;
  });

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 p-4 md:p-8">
      <section className="cv-card rounded-xl p-6">
        <div className="cv-kicker text-xs font-semibold uppercase tracking-[0.2em]">
          {profile.headline} · {profile.location}
        </div>
        <h1 className="cv-title mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {renderName(profile.name)}
        </h1>
        <div className="cv-subtitle mt-4 flex flex-wrap gap-3 text-sm">
          <span>@{profile.username}</span>
          <span>{profile.email}</span>
          <span>{profile.location}</span>
        </div>
        <div className="cv-summary mt-6 rounded-r-md px-4 py-3">
          <p className="text-sm italic leading-7 text-[var(--text-dim)]">
            {profile.bio}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="cv-kicker text-xs font-semibold uppercase tracking-widest">
            00
          </span>
          <h2 className="cv-title text-xl font-semibold">Edit Profile</h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <ProfileEditorForm
          username={profile.username}
          initialName={profile.name}
          initialHeadline={profile.headline}
          initialLocation={profile.location}
          initialBio={profile.bio}
          initialAvatarUrl={profile.avatarUrl}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cv-stat rounded-xl p-4 text-center">
          <div className="cv-stat-number text-3xl font-semibold">
            {profile._count.posts}
          </div>
          <div className="cv-muted text-xs font-semibold uppercase tracking-widest">
            Posts
          </div>
        </div>
        <div className="cv-stat rounded-xl p-4 text-center">
          <div className="cv-stat-number text-3xl font-semibold">
            {connections.length}
          </div>
          <div className="cv-muted text-xs font-semibold uppercase tracking-widest">
            Connections
          </div>
        </div>
        <div className="cv-stat rounded-xl p-4 text-center">
          <div className="cv-stat-number text-3xl font-semibold">
            {pendingIncoming}
          </div>
          <div className="cv-muted text-xs font-semibold uppercase tracking-widest">
            Pending In
          </div>
        </div>
        <div className="cv-stat rounded-xl p-4 text-center">
          <div className="cv-stat-number text-3xl font-semibold">
            {pendingOutgoing}
          </div>
          <div className="cv-muted text-xs font-semibold uppercase tracking-widest">
            Pending Out
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="cv-kicker text-xs font-semibold uppercase tracking-widest">
            01
          </span>
          <h2 className="cv-title text-xl font-semibold">Posts</h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {profile.posts.length ? (
          <div className="space-y-3">
            {profile.posts.map((post) => (
              <article key={post.id} className="cv-card rounded-xl p-4">
                <time className="cv-muted text-xs">
                  {post.createdAt.toLocaleDateString()}
                </time>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-dim)]">
                  {post.content}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="cv-card cv-subtitle rounded-xl p-4 text-sm">
            No posts yet.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="cv-kicker text-xs font-semibold uppercase tracking-widest">
            02
          </span>
          <h2 className="cv-title text-xl font-semibold">Connections</h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {connections.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {connections.map((connection) => (
              <article key={connection.id} className="cv-card rounded-xl p-4">
                <p className="font-medium text-[var(--text)]">
                  {connection.name}
                </p>
                <Link
                  href={`/profiles/${connection.username}`}
                  className="cv-link text-sm"
                >
                  @{connection.username}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="cv-card cv-subtitle rounded-xl p-4 text-sm">
            No accepted connections yet.
          </p>
        )}
      </section>
    </main>
  );
}
