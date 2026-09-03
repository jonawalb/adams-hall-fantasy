"use client";

import { LeaderRow, Member, PickRow, Slate, leaderboard } from "@/lib/pickem";

interface Props {
  slate: Slate;
  week: number;
  picks: PickRow[];
  members: Member[];
  myId: string | null;
}

function Table({ title, rows, total, myId }: { title: string; rows: LeaderRow[]; total: number; myId: string | null }) {
  return (
    <div className="panel p-4">
      <p className="kicker">{title}</p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.member.id} className={`border-t border-line ${r.member.id === myId ? "text-gold-bright" : ""}`}>
              <td className="font-mono-num w-8 py-1.5 text-cream-dim">{i + 1}</td>
              <td className="font-head py-1.5 font-semibold">{r.member.display_name}</td>
              <td className="font-mono-num py-1.5 text-right">
                {r.correct}
                <span className="text-cream-dim"> / {total}</span>
              </td>
              <td className="py-1.5 pl-3 text-right text-xs text-cream-dim">{r.made} picked</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-2 text-cream-dim">No members loaded.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function PickemLeaderboard({ slate, week, picks, members, myId }: Props) {
  const weekGames = slate.weeks[week]?.games ?? [];
  const allGames = Object.values(slate.weeks).flatMap((w) => w.games);
  const multiWeek = Object.keys(slate.weeks).length > 1;

  return (
    <section className={`grid gap-4 ${multiWeek ? "lg:grid-cols-2" : ""}`}>
      <Table title={`Week ${week} leaderboard`} rows={leaderboard(weekGames, picks, members)} total={weekGames.length} myId={myId} />
      {multiWeek && (
        <Table title={`${slate.season} season`} rows={leaderboard(allGames, picks, members)} total={allGames.length} myId={myId} />
      )}
    </section>
  );
}
