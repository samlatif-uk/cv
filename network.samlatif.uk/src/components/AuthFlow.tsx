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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mode = useMemo<Mode>(() => {
    return searchParams.get("mode") === "signup" ? "signup" : "login";
  }, [searchParams]);

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const oauthLabel =
    googleEnabled && linkedInEnabled
      ? "Google or LinkedIn"
      : googleEnabled
        ? "Google"
        : linkedInEnabled
          ? "LinkedIn"
          : "OAuth";

  async function start(provider: "google" | "linkedin") {
    setPending(true);
    setError(null);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      setPending(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      if (mode === "signup") {
        const response = await fetch("/api/auth/email-signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: normalizedEmail,
            password: trimmedPassword,
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          let errorMessage = "Unable to create account.";

          if (responseText) {
            try {
              const payload = JSON.parse(responseText) as { error?: string };
              if (payload.error) {
                errorMessage = payload.error;
              }
            } catch {
              errorMessage = "Unable to create account. Please try again.";
            }
          }

          setError(errorMessage);
          return;
        }
      }

      const result = await signIn("credentials", {
        email: normalizedEmail,
        password: trimmedPassword,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(result?.url || callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
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
          ? `Create your account with email${googleEnabled || linkedInEnabled ? ` or ${oauthLabel}` : ""}.`
          : `Log in with email${googleEnabled || linkedInEnabled ? ` or ${oauthLabel}` : ""} to continue.`}
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleEmailSubmit}>
        {mode === "signup" ? (
          <label className="block space-y-1 text-sm">
            <span className="cv-muted">Name (optional)</span>
            <input
              type="text"
              className="cv-input w-full rounded-md border px-3 py-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
              autoComplete="name"
              suppressHydrationWarning
            />
          </label>
        ) : null}

        <label className="block space-y-1 text-sm">
          <span className="cv-muted">Email</span>
          <input
            type="email"
            className="cv-input w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            autoComplete="email"
            required
            suppressHydrationWarning
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="cv-muted">Password</span>
          <input
            type="password"
            className="cv-input w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            minLength={8}
            required
            suppressHydrationWarning
          />
        </label>

        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium"
          disabled={pending}
        >
          {mode === "signup" ? "Sign up with email" : "Log in with email"}
        </button>
      </form>

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
          OAuth providers are not configured yet. Email sign up and login are
          still available.
        </p>
      ) : mode === "signup" ? (
        <p className="cv-muted mt-4 text-xs">
          First-time OAuth users automatically get a new Craftfolio profile.
        </p>
      ) : null}

      {error ? <p className="cv-danger mt-3 text-sm">{error}</p> : null}
    </section>
  );
}
