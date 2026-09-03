"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// next/image with `unoptimized` uses src verbatim — prepend basePath ourselves.
const CREST = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/crest.png`;

const LINKS = [
  { href: "/pickem", label: "Pick'Em" },
  { href: "/", label: "Brethren" },
  { href: "/quotes", label: "Bonk Bracket" },
  { href: "/south-star", label: "South Star" },
  { href: "/cfb", label: "CFB" },
  { href: "/halls", label: "Halls" },
  { href: "/clubhouse", label: "Clubhouse", stats: true },
  { href: "/standings", label: "Standings", stats: true },
  { href: "/matchups", label: "Matchups", stats: true },
  { href: "/rivalries", label: "Rivalries", stats: true },
  { href: "/records", label: "Record Book", stats: true },
  { href: "/history", label: "History", stats: true },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabase();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session),
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // Outside the gate there is nothing to navigate to: show the brand alone.
  // Preview mode (no Supabase) keeps the tabs so local dev stays browsable.
  const showTabs = !supabase || signedIn;

  return (
    <header className="sticky top-0 z-40 border-b border-line-strong bg-felt-deep/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <Image
            src={CREST}
            alt=""
            width={36}
            height={36}
            className="shrink-0 transition-transform group-hover:scale-105"
          />
          <span className="flex items-baseline gap-3">
            <span className="font-display whitespace-nowrap text-lg leading-none text-gold-bright transition-colors group-hover:text-gold sm:text-xl">
              ADAMS HALL
            </span>
            <span className="kicker hidden whitespace-nowrap text-cream-dim xl:inline">Fantasy League</span>
          </span>
        </Link>
        {showTabs && (
          <nav className="flex items-center gap-1 overflow-x-auto">
            {LINKS.map((l, i) => {
              const active = pathname === l.href || pathname === `${l.href}/`;
              const firstStat = l.stats && !LINKS[i - 1]?.stats;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`font-head whitespace-nowrap rounded-sm px-2 py-1.5 text-[0.8rem] font-semibold uppercase tracking-wider transition-colors lg:text-sm ${
                    firstStat ? "ml-3 border-l border-line-strong pl-4" : ""
                  } ${
                    active
                      ? "bg-gold text-felt-deep"
                      : l.stats
                        ? "text-cream-dim/70 hover:bg-raised hover:text-cream"
                        : "text-cream-dim hover:bg-raised hover:text-cream"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            {signedIn && (
              <button
                onClick={signOut}
                className="font-head ml-2 whitespace-nowrap rounded-sm border border-gold-deep px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-gold hover:bg-gold hover:text-felt-deep"
              >
                Sign Out
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
