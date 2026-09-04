// Build the data pack for a week's recap from the ESPN archive.
// Usage: node scripts/recap-pack.mjs <year> <week>
// Prints markdown: matchups with scores, every starter's points, bench
// blunders, waiver adds, standings after the week. Paste into the recap
// prompt (docs/recap-style.md).
import fs from "fs";
import path from "path";

const [year, week] = process.argv.slice(2).map(Number);
if (!year || !week) {
  console.error("usage: node scripts/recap-pack.mjs <year> <week>");
  process.exit(1);
}
const DATA = path.join(process.cwd(), "data", "espn");
const read = (f, fb) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fb);
let season = read(path.join(DATA, `season-${year}.json`), null);
if (Array.isArray(season)) season = season[0];
if (!season) {
  console.error(`no season file for ${year}`);
  process.exit(1);
}
const OVERRIDES = { "{DD52DE43-FADF-409D-809E-6E6707F0216F}": "Bitch Boy" };
const memberName = new Map(season.members.map((m) => [m.id, `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()]));
const team = (id) => season.teams.find((t) => t.id === id);
const owner = (t) => OVERRIDES[t.owners?.[0]] ?? memberName.get(t.owners?.[0]) ?? "?";
const box = read(path.join(DATA, "boxscores", `${year}-wk${String(week).padStart(2, "0")}.json`), null);
const players = read(path.join(DATA, `players-${year}.json`), {});
const tx = read(path.join(DATA, `transactions-${year}.json`), []);
const f1 = (n) => Number(n).toFixed(1);

const out = [];
out.push(`# Data pack · ${year} Week ${week}\n`);

// Standings (team records are season-to-date at archive time)
out.push(`## Standings (season to date)`);
for (const t of [...season.teams].sort((a, b) => b.record.overall.wins - a.record.overall.wins || b.record.overall.pointsFor - a.record.overall.pointsFor))
  out.push(`- ${t.name} (${owner(t)}): ${t.record.overall.wins}-${t.record.overall.losses}, ${f1(t.record.overall.pointsFor)} PF`);
out.push("");

// Matchups
const games = season.schedule.filter((g) => g.matchupPeriodId === week && g.home?.teamId != null && g.away?.teamId != null);
out.push(`## Matchups`);
for (const g of games) {
  const h = team(g.home.teamId), a = team(g.away.teamId);
  const hp = g.home.totalPoints ?? 0, ap = g.away.totalPoints ?? 0;
  const winner = hp > ap ? h : a, loser = winner === h ? a : h;
  out.push(`\n### ${a.name} (${owner(a)}) ${f1(ap)} at ${h.name} (${owner(h)}) ${f1(hp)} — ${winner.name} by ${f1(Math.abs(hp - ap))}${g.playoffTierType && g.playoffTierType !== "NONE" ? ` [${g.playoffTierType}]` : ""}`);
  if (box) {
    const bm = box.matchups.find((m) => (m.home.teamId === h.id && m.away.teamId === a.id) || (m.home.teamId === a.id && m.away.teamId === h.id));
    if (bm) {
      for (const side of [bm.away, bm.home]) {
        const t = team(side.teamId);
        const starters = side.lineup.filter((e) => !["BE", "IR"].includes(e.slot)).sort((x, y) => y.points - x.points);
        const bench = side.lineup.filter((e) => ["BE", "IR"].includes(e.slot)).sort((x, y) => y.points - x.points);
        out.push(`- **${t.name} (${owner(t)}) starters:** ` + starters.map((e) => `${e.name ?? e.playerId} ${e.pos ?? ""} ${f1(e.points)}`).join(" · "));
        if (bench.length) out.push(`  - bench: ` + bench.map((e) => `${e.name ?? e.playerId} ${f1(e.points)}`).join(" · "));
      }
    }
  }
  void loser;
}
out.push("");

// League-wide top/bottom performers this week
if (box) {
  const all = box.matchups.flatMap((m) => [m.home, m.away]).flatMap((s) => s.lineup.filter((e) => !["BE", "IR"].includes(e.slot)).map((e) => ({ ...e, team: team(s.teamId) })));
  const top = [...all].sort((x, y) => y.points - x.points).slice(0, 6);
  const dud = [...all].filter((e) => e.pos !== "K" && e.pos !== "D/ST").sort((x, y) => x.points - y.points).slice(0, 6);
  out.push(`## Top starters this week`);
  for (const e of top) out.push(`- ${e.name} (${e.pos}) ${f1(e.points)} for ${e.team?.name} (${owner(e.team)})`);
  out.push(`\n## Worst starters this week`);
  for (const e of dud) out.push(`- ${e.name} (${e.pos}) ${f1(e.points)} for ${e.team?.name} (${owner(e.team)})`);
  const benched = box.matchups.flatMap((m) => [m.home, m.away]).flatMap((s) => s.lineup.filter((e) => ["BE", "IR"].includes(e.slot)).map((e) => ({ ...e, team: team(s.teamId) }))).sort((x, y) => y.points - x.points).slice(0, 5);
  out.push(`\n## Biggest points left on the bench`);
  for (const e of benched) out.push(`- ${e.name} (${e.pos}) ${f1(e.points)} benched by ${e.team?.name} (${owner(e.team)})`);
  out.push("");
}

// Waiver adds this week
const adds = tx.filter((t) => (t.type === "WAIVER" || t.type === "FREEAGENT") && t.status === "EXECUTED" && t.scoringPeriodId === week).flatMap((t) => t.items.filter((i) => i.type === "ADD").map((i) => ({ ...i, kind: t.type })));
if (adds.length) {
  out.push(`## Waiver / free-agent adds this week`);
  for (const a of adds) {
    const t = team(a.toTeamId);
    const p = players[String(a.playerId)];
    out.push(`- ${t?.name} (${owner(t)}) added ${p?.name ?? a.playerId}${p?.pos ? ` (${p.pos})` : ""} via ${a.kind.toLowerCase()}`);
  }
  out.push("");
}
console.log(out.join("\n"));
