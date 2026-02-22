"use client";

import { useState } from "react";

type ProfileEditorFormProps = {
  username: string;
  initialName: string;
  initialHeadline: string;
  initialLocation: string;
  initialBio: string;
  initialAvatarUrl: string | null;
};

export function ProfileEditorForm({
  username,
  initialName,
  initialHeadline,
  initialLocation,
  initialBio,
  initialAvatarUrl,
}: ProfileEditorFormProps) {
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [location, setLocation] = useState(initialLocation);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/profiles/${username}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          headline,
          location,
          bio,
          avatarUrl,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save profile.");
      }

      setMessage("Profile saved.");
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="cv-input rounded-md px-3 py-2 text-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
        />
        <input
          className="cv-input rounded-md px-3 py-2 text-sm"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          placeholder="Headline"
        />
        <input
          className="cv-input rounded-md px-3 py-2 text-sm"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
        />
        <input
          className="cv-input rounded-md px-3 py-2 text-sm"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          placeholder="Avatar URL (optional)"
        />
      </div>
      <textarea
        className="cv-input min-h-[108px] rounded-md px-3 py-2 text-sm"
        value={bio}
        onChange={(event) => setBio(event.target.value)}
        placeholder="Bio"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="cv-danger text-sm">{error || message}</p>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
