"use client";

import { useState } from "react";

export function ConnectButton({
  isAuthenticated,
  receiverUsername,
}: {
  isAuthenticated: boolean;
  receiverUsername: string;
}) {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function requestConnection() {
    setStatus("idle");

    const response = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverUsername }),
    });

    if (response.ok) {
      setStatus("sent");
      return;
    }

    setStatus("error");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="cv-btn-secondary rounded-md px-3 py-1.5 text-sm font-medium"
        onClick={requestConnection}
        disabled={status === "sent" || !isAuthenticated}
      >
        {status === "sent" ? "Requested" : "Connect"}
      </button>
      {status === "error" ? (
        <span className="cv-danger text-xs">Failed</span>
      ) : !isAuthenticated ? (
        <span className="cv-muted text-xs">Login required</span>
      ) : null}
    </div>
  );
}
