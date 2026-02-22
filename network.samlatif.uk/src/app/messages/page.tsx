import { MessageComposer } from "@/components/MessageComposer";
import Link from "next/link";
import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MessagesPage() {
  const currentUsername = await getCurrentUsername();

  if (!currentUsername) {
    return (
      <main className="mx-auto w-full max-w-4xl p-4 md:p-8">
        <p className="cv-subtitle text-sm">
          Log in from the nav to view messages.
        </p>
      </main>
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { username: currentUsername },
    select: { id: true, username: true, name: true },
  });

  if (!currentUser) {
    return (
      <main className="mx-auto w-full max-w-4xl p-4 md:p-8">
        <p className="cv-subtitle text-sm">Current demo user not found.</p>
      </main>
    );
  }

  const [recipients, conversations] = await Promise.all([
    prisma.user.findMany({
      where: { username: { not: currentUser.username } },
      select: { username: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: {
                username: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <section>
        <div className="cv-kicker text-xs font-semibold uppercase tracking-[0.2em]">
          03 · Craftfolio Inbox
        </div>
        <h1 className="cv-title mt-2 text-2xl font-semibold">
          Craftfolio Messages
        </h1>
        <p className="cv-subtitle mt-1 text-sm">
          Direct messaging between professionals.
        </p>
      </section>

      <MessageComposer recipients={recipients} />

      <section className="space-y-4">
        {conversations.map((conversation) => {
          const participantNames = conversation.members
            .map((member) => member.user)
            .filter((user) => user.id !== currentUser.id)
            .map((user) => user);

          return (
            <article key={conversation.id} className="cv-card rounded-xl p-4">
              <p className="text-sm font-medium text-[var(--text)]">
                {participantNames.length
                  ? participantNames.map((user, index) => (
                      <span key={user.id}>
                        {index > 0 ? ", " : ""}
                        <Link
                          href={`/profiles/${user.username}`}
                          className="cv-link"
                        >
                          {user.name}
                        </Link>
                      </span>
                    ))
                  : "Conversation"}
              </p>
              <div className="mt-3 space-y-2">
                {conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--bg3)] px-3 py-2"
                  >
                    <p className="cv-muted text-xs">
                      <Link
                        href={`/profiles/${message.sender.username}`}
                        className="cv-link"
                      >
                        {message.sender.name}
                      </Link>
                    </p>
                    <p className="text-sm text-[var(--text-dim)]">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
