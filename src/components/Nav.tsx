"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// next/image with `unoptimized` uses src verbatim — prepend basePath ourselves.
const CREST = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/crest.png`;

interface Item {
  href: string;
  label: string;
}
interface Section {
  title?: string;
  items: Item[];
}
interface Group {
  label: string;
  href?: string; // plain link when set
  sections?: Section[];
}

const GROUPS: Group[] = [
  { label: "Brethren", href: "/" },
  {
    label: "2026 Season",
    sections: [
      {
        items: [
          { href: "/pickem", label: "NFL Pick'Em" },
          { href: "/season/matchup-pickem", label: "Matchup Pick'Em" },
          { href: "/standings", label: "Standings" },
          { href: "/matchups", label: "Matchups" },
          { href: "/clubhouse", label: "Dashboard" },
          { href: "/season/bad-decisions", label: "Bad Decisions" },
        ],
      },
    ],
  },
  { label: "Bonk Bracket", href: "/quotes" },
  { label: "Halls", href: "/halls" },
  {
    label: "Archives",
    sections: [
      {
        title: "Record Book",
        items: [
          { href: "/records", label: "All-time" },
          { href: "/records/regular", label: "Regular Season" },
          { href: "/records/playoffs", label: "Playoffs" },
        ],
      },
      {
        title: "Rivalries",
        items: [
          { href: "/rivalries", label: "All games" },
          { href: "/rivalries/regular", label: "Regular Season" },
          { href: "/rivalries/playoffs", label: "Playoffs" },
        ],
      },
      { title: "History", items: [{ href: "/history", label: "Season by season" }] },
    ],
  },
  {
    label: "Extras",
    sections: [
      {
        items: [
          { href: "/south-star", label: "South Star Narrative" },
          { href: "/cfb", label: "College Football" },
        ],
      },
    ],
  },
];

const isActive = (pathname: string | null, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname === `${href}/` || pathname?.startsWith(`${href}/`) === true;

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabase();
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const showTabs = !supabase || signedIn;
  const tab = (active: boolean) =>
    `font-head whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
      active ? "bg-gold text-felt-deep" : "text-cream-dim hover:bg-raised hover:text-cream"
    }`;
  const groupActive = (g: Group) => (g.href ? isActive(pathname, g.href) : g.sections!.some((s) => s.items.some((i) => isActive(pathname, i.href))));

  return (
    <header className="sticky top-0 z-40 border-b border-line-strong bg-felt-deep/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3" onClick={() => setMobile(false)}>
          <Image src={CREST} alt="" width={36} height={36} className="shrink-0 transition-transform group-hover:scale-105" />
          <span className="flex items-baseline gap-3">
            <span className="font-display whitespace-nowrap text-lg leading-none text-gold-bright transition-colors group-hover:text-gold sm:text-xl">
              ADAMS HALL
            </span>
            <span className="kicker hidden whitespace-nowrap text-cream-dim xl:inline">Fantasy League</span>
          </span>
        </Link>

        {showTabs && (
          <>
            {/* Desktop */}
            <nav className="hidden items-center gap-1 md:flex">
              {GROUPS.map((g) =>
                g.href ? (
                  <Link key={g.label} href={g.href} className={tab(groupActive(g))}>
                    {g.label}
                  </Link>
                ) : (
                  <div
                    key={g.label}
                    className="relative"
                    onMouseEnter={() => setOpen(g.label)}
                    onMouseLeave={() => setOpen((o) => (o === g.label ? null : o))}
                  >
                    <button type="button" onClick={() => setOpen(open === g.label ? null : g.label)} className={tab(groupActive(g))}>
                      {g.label} <span className="text-xs opacity-70">▾</span>
                    </button>
                    {open === g.label && (
                      <div className="absolute right-0 top-full z-50 min-w-48 rounded-sm border border-line-strong bg-felt-deep p-1.5 shadow-lg">
                        {g.sections!.map((s, si) => (
                          <div key={si} className={si > 0 ? "mt-1 border-t border-line pt-1" : ""}>
                            {s.title && <p className="kicker px-3 pb-0.5 pt-1 !text-[0.6rem]">{s.title}</p>}
                            {s.items.map((it) => (
                              <Link
                                key={it.href}
                                href={it.href}
                                onClick={() => setOpen(null)}
                                className={`font-head block whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-semibold uppercase tracking-wider ${
                                  isActive(pathname, it.href) ? "bg-gold text-felt-deep" : "text-cream-dim hover:bg-raised hover:text-cream"
                                }`}
                              >
                                {it.label}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
              {signedIn && (
                <>
                  <Link href="/account" className={`ml-2 ${tab(isActive(pathname, "/account"))}`}>
                    Account
                  </Link>
                  <button
                    onClick={signOut}
                    className="font-head ml-1 whitespace-nowrap rounded-sm border border-gold-deep px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-gold hover:bg-gold hover:text-felt-deep"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </nav>

            {/* Mobile */}
            <button
              type="button"
              onClick={() => setMobile((m) => !m)}
              className="font-head rounded-sm border border-line px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-cream md:hidden"
              aria-expanded={mobile}
            >
              {mobile ? "Close" : "Menu"}
            </button>
          </>
        )}
      </div>

      {showTabs && mobile && (
        <nav className="border-t border-line bg-felt-deep px-4 pb-4 pt-2 md:hidden">
          {GROUPS.map((g) => (
            <div key={g.label} className="py-1.5">
              {g.href ? (
                <Link href={g.href} onClick={() => setMobile(false)} className={`block ${tab(groupActive(g))}`}>
                  {g.label}
                </Link>
              ) : (
                <>
                  <p className="kicker px-2.5 pb-1">{g.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {g.sections!.flatMap((s) =>
                      s.items.map((it) => (
                        <Link key={it.href} href={it.href} onClick={() => setMobile(false)} className={`block ${tab(isActive(pathname, it.href))}`}>
                          {s.title && s.title !== "History" ? `${s.title}: ${it.label}` : it.label}
                        </Link>
                      )),
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {signedIn && (
            <div className="mt-2 flex gap-2 border-t border-line pt-3">
              <Link href="/account" onClick={() => setMobile(false)} className={tab(isActive(pathname, "/account"))}>
                Account
              </Link>
              <button onClick={signOut} className="font-head rounded-sm border border-gold-deep px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-gold">
                Sign Out
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
