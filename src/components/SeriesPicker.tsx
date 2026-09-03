"use client";

import { useState } from "react";
import type { Owner, Series } from "@/lib/rivalry";

interface Props {
  owners: Owner[];
  all: Series[];
}

export default function SeriesPicker({ owners, all }: Props) {
  const [aId, setA] = useState(owners[0]?.id ?? "");
  const [bId, setB] = useState(owners[1]?.id ?? "");
  const s = all.find(
    (x) => (x.a.id === aId && x.b.id === bId) || (x.a.id === bId && x.b.id === aId),
  );
  // Present the series from the perspective of the first pick.
  const flipped = s ? s.a.id !== aId : false;
  const view = s && {
    a: flipped ? s.b : s.a,
    b: flipped ? s.a : s.b,
    aWins: flipped ? s.bWins : s.aWins,
    bWins: flipped ? s.aWins : s.bWins,
    aPts: flipped ? s.bPts : s.aPts,
    bPts: flipped ? s.aPts : s.bPts,
    streak: s.streak && { n: s.streak.n, side: flipped ? (s.streak.side === "a" ? "b" : "a") : s.streak.side },
    meetings: [...s.meetings].reverse().map((m) =>
      flipped
        ? { ...m, aTeam: m.bTeam, bTeam: m.aTeam, aPts: m.bPts, bPts: m.aPts, winner: m.winner === "a" ? "b" : m.winner === "b" ? "a" : "tie" }
        : m,
    ),
  };

  const select = "font-head rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-cream focus:border-gold focus:outline-none";

  return (
    <section className="space-y-4">
      <header>
        <p className="kicker">Series Lookup</p>
        <h2 className="font-display mt-1 text-2xl text-gold-bright">PICK A FEUD</h2>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <select value={aId} onChange={(e) => setA(e.target.value)} className={select}>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <span className="kicker">vs</span>
        <select value={bId} onChange={(e) => setB(e.target.value)} className={select}>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      {!s || !view ? (
        <p className="text-sm text-cream-dim">
          {aId === bId ? "Pick two different owners." : "These two have never met."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="panel panel-gold p-5 lg:col-span-2">
            <p className="font-head text-lg font-semibold">
              {view.a.first} vs {view.b.first}
            </p>
            <p className="font-mono-num mt-1 text-4xl text-gold-bright">
              {view.aWins}–{view.bWins}
              {s.ties > 0 && <span className="text-2xl text-cream-dim">–{s.ties}</span>}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-cream-dim">Meetings</dt>
              <dd className="font-mono-num text-right">{s.meetings.length}{s.playoffMeetings ? ` (${s.playoffMeetings} playoff)` : ""}</dd>
              <dt className="text-cream-dim">Points</dt>
              <dd className="font-mono-num text-right">{view.aPts.toFixed(1)} – {view.bPts.toFixed(1)}</dd>
              <dt className="text-cream-dim">Avg margin</dt>
              <dd className="font-mono-num text-right">{s.avgMargin.toFixed(1)}</dd>
              <dt className="text-cream-dim">Streak</dt>
              <dd className="font-mono-num text-right">
                {view.streak ? `${view.streak.side === "a" ? view.a.first : view.b.first} W${view.streak.n}` : "—"}
              </dd>
              {s.biggest && (
                <>
                  <dt className="text-cream-dim">Biggest win</dt>
                  <dd className="text-right">
                    <span className="font-mono-num">{s.biggest.margin.toFixed(1)}</span>
                    <span className="text-cream-dim"> · {s.biggest.year} wk {s.biggest.week}</span>
                  </dd>
                </>
              )}
              {s.closest && (
                <>
                  <dt className="text-cream-dim">Closest</dt>
                  <dd className="text-right">
                    <span className="font-mono-num">{s.closest.margin.toFixed(1)}</span>
                    <span className="text-cream-dim"> · {s.closest.year} wk {s.closest.week}</span>
                  </dd>
                </>
              )}
            </dl>
          </div>
          <div className="panel overflow-x-auto p-4 lg:col-span-3">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="kicker text-left">
                  <th className="py-1 font-normal">When</th>
                  <th className="py-1 text-right font-normal">{view.a.first}</th>
                  <th className="py-1 text-right font-normal">{view.b.first}</th>
                  <th className="py-1 text-right font-normal">Margin</th>
                </tr>
              </thead>
              <tbody>
                {view.meetings.map((m) => (
                  <tr key={`${m.year}-${m.week}`} className="border-t border-line">
                    <td className="py-1.5">
                      {m.year} · Wk {m.week}
                      {m.playoff && <span className="ml-2 rounded-sm bg-gold/20 px-1 text-[0.6rem] uppercase tracking-wider text-gold-bright">Playoff</span>}
                    </td>
                    <td className={`font-mono-num py-1.5 text-right ${m.winner === "a" ? "text-gold-bright" : ""}`}>{m.aPts.toFixed(1)}</td>
                    <td className={`font-mono-num py-1.5 text-right ${m.winner === "b" ? "text-gold-bright" : ""}`}>{m.bPts.toFixed(1)}</td>
                    <td className="font-mono-num py-1.5 text-right text-cream-dim">{m.margin.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
