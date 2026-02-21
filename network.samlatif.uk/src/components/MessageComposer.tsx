"use client";

import { useState } from "react";

type Recipient = {
  username: string;
  name: string;
};

export function MessageComposer({
  senderUsername,
  recipients,
}: {
  senderUsername: string;
  recipients: Recipient[];
}) {
  const [recipientUsername, setRecipientUsername] = useState(
    recipients[0]?.username ?? "",
  );
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!recipientUsername || !content.trim()) {
      setError("Pick a recipient and write a message.");
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderUsername, recipientUsername, content }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not send message.");
      }

      setContent("");
      window.location.reload();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send message.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
        <select
          className="cv-input rounded-md px-3 py-2 text-sm"
          value={recipientUsername}
          onChange={(event) => setRecipientUsername(event.target.value)}
        >
          {recipients.map((recipient) => (
            <option key={recipient.username} value={recipient.username}>
              {recipient.name} (@{recipient.username})
            </option>
          ))}
        </select>
        <input
          className="cv-input rounded-md px-3 py-2 text-sm"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a message"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="cv-danger text-sm">{error}</p>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={sending}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
