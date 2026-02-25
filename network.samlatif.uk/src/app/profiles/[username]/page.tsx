import { notFound } from "next/navigation";
import { ProfileCv } from "@/components/CvProfile";
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
