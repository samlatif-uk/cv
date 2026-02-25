"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

function linkClass(active: boolean) {
  return active ? "cv-link-active" : "cv-link";
}

export function AppNav({
  currentUsername,
  googleEnabled,
  linkedInEnabled,
}: {
  currentUsername: string | null;
  googleEnabled: boolean;
  linkedInEnabled: boolean;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);

    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      setPending(false);
    }
  }

  return (
    <nav className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 md:px-8">
      <Link href="/" className="cv-link-active text-sm font-semibold">
        Craftfolio
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link className={linkClass(pathname === "/")} href="/">
          Feed
        </Link>
        <Link
          className={linkClass(pathname.startsWith("/people"))}
          href="/people"
        >
          People
        </Link>
        <Link
          className={linkClass(pathname.startsWith("/messages"))}
          href="/messages"
        >
          Messages
        </Link>
        <Link
          className={linkClass(pathname.startsWith("/profiles"))}
          href={currentUsername ? `/profiles/${currentUsername}` : "/people"}
        >
          My Profile
        </Link>
        <div className="flex items-center gap-2">
          {currentUsername ? (
            <button
              type="button"
              className="cv-btn-secondary rounded-md px-2 py-1 text-xs font-medium"
              onClick={logout}
              disabled={pending}
            >
              Logout
            </button>
          ) : (
            <>
              {googleEnabled || linkedInEnabled ? (
                <>
                  <Link
                    href="/auth?mode=login"
                    className="cv-btn-secondary rounded-md px-2 py-1 text-xs font-medium"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    className="cv-btn-primary rounded-md px-2 py-1 text-xs font-medium"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <span className="cv-muted text-xs">OAuth not configured</span>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
