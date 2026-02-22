"use client";

import { useState } from "react";

type CurrentUser = {
  username: string;
  name: string;
};

export function CreatePostForm({ currentUser }: { currentUser: CurrentUser }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Write a post.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not create post.");
      }

      setContent("");
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create post.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <p className="cv-muted text-xs">
        Posting as {currentUser.name} (@{currentUser.username})
      </p>
      <div className="grid gap-3">
        <textarea
          className="cv-input min-h-[88px] rounded-md px-3 py-2 text-sm"
          placeholder="Share an update"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="cv-danger text-sm">{error}</p>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
