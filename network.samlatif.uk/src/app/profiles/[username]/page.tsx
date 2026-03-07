import { notFound } from "next/navigation";
import { ProfileCv } from "@/components/CvProfile";
import { getCurrentUsernameSafe } from "@/lib/runtimeSafe";
import { getFallbackCvProfilePayload } from "@/lib/fallbackCvProfile";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [payload, currentUsername] = await Promise.all([
    import("@/lib/cvProfileData")
      .then(({ getCvProfilePayload }) => getCvProfilePayload(username))
      .catch((error) => {
        console.error("[profile] Failed to load DB profile payload", error);
        return getFallbackCvProfilePayload(username);
      }),
    getCurrentUsernameSafe(),
  ]);

  if (!payload) {
    notFound();
  }

  const canEdit = currentUsername === payload.profile.username;
  return (
    <ProfileCv
      data={payload.data}
      canEdit={canEdit}
      profile={{
        username: payload.profile.username,
        name: payload.profile.name,
        email: payload.profile.email,
        headline: payload.profile.headline,
        location: payload.profile.location,
        bio: payload.profile.bio,
        summary: payload.profile.summary,
        avatarUrl: payload.profile.avatarUrl,
      }}
    />
  );
}
