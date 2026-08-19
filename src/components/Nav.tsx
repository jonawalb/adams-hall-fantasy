"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Clubhouse" },
  { href: "/standings", label: "Standings" },
  { href: "/matchups", label: "Matchups" },
  { href: "/rivalries", label: "Rivalries" },
  { href: "/records", label: "Record Book" },
  { href: "/history", label: "History" },
  { href: "/pickem", label: "Pick'Em" },
  { href: "/quotes", label: "Quote Wall" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line-strong bg-felt-deep/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-display text-lg leading-none text-gold-bright transition-colors group-hover:text-gold sm:text-xl">
            ADAMS HALL
          </span>
          <span className="kicker hidden text-cream-dim sm:inline">Fantasy League</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname === `${l.href}/`;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`font-head whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors sm:text-[0.9rem] ${
                  active
                    ? "bg-gold text-felt-deep"
                    : "text-cream-dim hover:bg-raised hover:text-cream"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="font-head ml-2 whitespace-nowrap rounded-sm border border-gold-deep px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-gold hover:bg-gold hover:text-felt-deep"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}
