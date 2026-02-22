import { notFound } from "next/navigation";
import { ProfileEditorForm } from "@/components/ProfileEditorForm";
import { SamCvProfile } from "@/components/SamCvProfile";
import { getCurrentUsername } from "@/lib/auth";
import { getSharedCvData } from "@/lib/cvData";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [profile, cvData, currentUsername] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        name: true,
        headline: true,
        location: true,
        bio: true,
        avatarUrl: true,
      },
    }),
    getSharedCvData(),
    getCurrentUsername(),
  ]);

  if (!profile) {
    notFound();
  }

  const canEdit = currentUsername === profile.username;

  return (
    <>
      <SamCvProfile data={cvData} />

      {canEdit ? (
        <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-8">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="cv-kicker text-xs font-semibold uppercase tracking-widest">
                06
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
        </main>
      ) : null}
    </>
  );
}
