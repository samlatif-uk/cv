"use client";

import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "signup";

export function AuthFlow({
  googleEnabled,
  linkedInEnabled,
}: {
  googleEnabled: boolean;
  linkedInEnabled: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const mode = useMemo<Mode>(() => {
    return searchParams.get("mode") === "signup" ? "signup" : "login";
  }, [searchParams]);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function start(provider: "google" | "linkedin") {
    setPending(true);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      setPending(false);
    }
  }

  function switchMode(nextMode: Mode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);
    router.replace(`/auth?${params.toString()}`);
  }

  return (
    <section className="cv-card rounded-xl p-6 md:p-8">
      <div className="mb-5 flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 ${mode === "login" ? "cv-btn-primary" : "cv-btn-secondary"}`}
          onClick={() => switchMode("login")}
          disabled={pending}
        >
          Log in
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 ${mode === "signup" ? "cv-btn-primary" : "cv-btn-secondary"}`}
          onClick={() => switchMode("signup")}
          disabled={pending}
        >
          Sign up
        </button>
      </div>

      <h1 className="cv-title text-2xl font-semibold">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="cv-subtitle mt-2 text-sm">
        {mode === "signup"
          ? "Use Google or LinkedIn to create your Craftfolio account."
          : "Log in with Google or LinkedIn to continue."}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {googleEnabled ? (
          <button
            type="button"
            className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium"
            onClick={() => start("google")}
            disabled={pending}
          >
            Continue with Google
          </button>
        ) : null}
        {linkedInEnabled ? (
          <button
            type="button"
            className="cv-btn-secondary rounded-md px-4 py-2 text-sm font-medium"
            onClick={() => start("linkedin")}
            disabled={pending}
          >
            Continue with LinkedIn
          </button>
        ) : null}
      </div>

      {!googleEnabled && !linkedInEnabled ? (
        <p className="cv-danger mt-4 text-sm">
          OAuth providers are not configured yet.
        </p>
      ) : mode === "signup" ? (
        <p className="cv-muted mt-4 text-xs">
          First-time OAuth users automatically get a new Craftfolio profile.
        </p>
      ) : null}
    </section>
  );
}
