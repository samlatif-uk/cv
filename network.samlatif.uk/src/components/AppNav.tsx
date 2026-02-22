"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function linkClass(active: boolean) {
  return active ? "cv-link-active" : "cv-link";
}

export function AppNav() {
  const pathname = usePathname();

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
          href="/profiles/samlatif"
        >
          Profile
        </Link>
      </div>
    </nav>
  );
}
