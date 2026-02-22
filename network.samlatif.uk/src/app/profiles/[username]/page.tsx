import { notFound } from "next/navigation";
import { OverviewStatsEditorForm } from "@/components/OverviewStatsEditorForm";
import { ProfileEditorForm } from "@/components/ProfileEditorForm";
import { SamCvProfile } from "@/components/SamCvProfile";
import { TechRowsEditorForm } from "@/components/TechRowsEditorForm";
import { getCurrentUsername } from "@/lib/auth";
import { getCvProfilePayload } from "@/lib/cvProfileData";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [payload, currentUsername] = await Promise.all([
    getCvProfilePayload(username),
    getCurrentUsername(),
  ]);

  if (!payload) {
    notFound();
  }

  const canEdit = currentUsername === payload.profile.username;

  return (
    <>
      <SamCvProfile
        data={payload.data}
        profile={{
          username: payload.profile.username,
          name: payload.profile.name,
          email: payload.profile.email,
          headline: payload.profile.headline,
          location: payload.profile.location,
          bio: payload.profile.bio,
          summary: payload.profile.summary,
        }}
      />

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
              username={payload.profile.username}
              initialName={payload.profile.name}
              initialHeadline={payload.profile.headline}
              initialLocation={payload.profile.location}
              initialBio={payload.profile.bio}
              initialAvatarUrl={payload.profile.avatarUrl}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="cv-kicker text-xs font-semibold uppercase tracking-widest">
                07
              </span>
              <h2 className="cv-title text-xl font-semibold">
                Edit Tech Skills
              </h2>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <TechRowsEditorForm
              username={payload.profile.username}
              initialTechRows={payload.data.TECH_ROWS}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="cv-kicker text-xs font-semibold uppercase tracking-widest">
                08
              </span>
              <h2 className="cv-title text-xl font-semibold">
                Edit Overview Stats
              </h2>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <OverviewStatsEditorForm
              username={payload.profile.username}
              initialOverviewStats={payload.data.OVERVIEW_STATS ?? []}
            />
          </section>
        </main>
      ) : null}
    </>
  );
}
