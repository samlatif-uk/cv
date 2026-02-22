"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";

function linkClass(active: boolean) {
  return active ? "cv-link-active" : "cv-link";
}

type NavUser = {
  username: string;
  name: string;
};

export function AppNav({
  users,
  currentUsername,
}: {
  users: NavUser[];
  currentUsername: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedUsername, setSelectedUsername] = useState(
    currentUsername ?? users[0]?.username ?? "",
  );
  const [pending, setPending] = useState(false);

  async function login() {
    if (!selectedUsername) {
      return;
    }

    setPending(true);

    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: selectedUsername }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    setPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
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
          <select
            className="cv-input rounded-md px-2 py-1 text-xs"
            value={selectedUsername}
            onChange={(event) => setSelectedUsername(event.target.value)}
            disabled={pending || users.length === 0}
          >
            {users.map((user) => (
              <option key={user.username} value={user.username}>
                {user.name}
              </option>
            ))}
          </select>
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
            <button
              type="button"
              className="cv-btn-primary rounded-md px-2 py-1 text-xs font-medium"
              onClick={login}
              disabled={pending || !selectedUsername}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
