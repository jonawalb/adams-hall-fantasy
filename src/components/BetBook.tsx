"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import PostThread from "@/components/PostThread";
import { parseBetInput } from "@/lib/parlayParser";
import { findGameForBet, findGameForLeg, type GameContext, type NflSlate, type CfbData, type RosterLookup } from "@/lib/gameContext";

const PREVIEW_ID = "preview";

type Result = "pending" | "won" | "lost" | "push" | "cashout";

export interface BettorConfig {
  name: string;
  espnOwnerIds: string[];
  emptyMessage: string;
  roasts: {
    loss: string[];
    streak: string[];
    parlay: string[];
    longshot: string[];
    win: string[];
    bigWin: string[];
    pendingParlay: string;
    pendingLongshot: string;
    streakBanner: string;
    winStreakBanner: string;
  };
}

interface Bet {
  id: number;
  description: string;
  share_url: string | null;
  odds: string | null;
  stake: string | null;
  result: Result | null;
  note: string | null;
  posted_by: string;
  bettor_tag: string | null;
  created_at: string;
  bet_type: string;
  combined_odds: string | null;
  verified_by: string | null;
}

interface Leg {
  id: number;
  bet_id: number;
  leg_order: number;
  description: string;
  market_type: string;
  team_abbr: string | null;
  odds: string | null;
  result: string | null;
  resolved_by: string | null;
}

const RESULT_STYLES: Record<string, string> = {
  won: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  lost: "bg-blood/20 text-blood border-blood/40",
  push: "bg-cream-dim/20 text-cream-dim border-cream-dim/40",
  cashout: "bg-gold/20 text-gold border-gold/40",
  pending: "bg-gold-deep/20 text-gold-bright border-gold-deep/40 animate-pulse",
};

const RESULT_LABELS: Record<string, string> = {
  won: "W",
  lost: "L",
  push: "PUSH",
  cashout: "CASH",
  pending: "LIVE",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isFanDuelLink(url: string): boolean {
  return /fanduel\.com/i.test(url);
}

function parseDollars(s: string | null): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function parseOdds(s: string | null): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.\-+]/g, ""));
  return isNaN(n) ? null : n;
}

function calcPayout(stake: number, odds: number): number {
  if (odds > 0) return stake * (odds / 100);
  if (odds < 0) return stake * (100 / Math.abs(odds));
  return 0;
}

function fmtMoney(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function isParlay(desc: string): boolean {
  return /parlay|leg|sgp|same.?game/i.test(desc);
}

function isLongshot(odds: string | null): boolean {
  const o = parseOdds(odds);
  return o !== null && o >= 300;
}

function pickRoast(arr: string[], seed: number): string {
  return arr[Math.abs(seed) % arr.length];
}

function getRoast(bet: Bet, lossStreak: number, cfg: BettorConfig): string | null {
  const seed = bet.id;
  if (bet.result === "lost") {
    if (isParlay(bet.description)) return pickRoast(cfg.roasts.parlay, seed);
    if (isLongshot(bet.odds)) {
      const o = parseOdds(bet.odds);
      return pickRoast(cfg.roasts.longshot, seed).replace("{odds}", String(o ?? ""));
    }
    if (lossStreak >= 3) return pickRoast(cfg.roasts.streak, seed);
    return pickRoast(cfg.roasts.loss, seed);
  }
  if (bet.result === "won") {
    const stake = parseDollars(bet.stake);
    const odds = parseOdds(bet.odds);
    if (stake && odds && calcPayout(stake, odds) >= 100) return pickRoast(cfg.roasts.bigWin, seed);
    return pickRoast(cfg.roasts.win, seed);
  }
  if (bet.result === "pending" && isParlay(bet.description)) return cfg.roasts.pendingParlay;
  if (bet.result === "pending" && isLongshot(bet.odds)) return cfg.roasts.pendingLongshot;
  return null;
}

function computeLossStreakAt(bets: Bet[], idx: number): number {
  let count = 0;
  for (let i = idx; i < bets.length; i++) {
    if (bets[i].result === "lost") count++;
    else break;
  }
  return count;
}

interface PltrData {
  symbol: string;
  current: number;
  prices: Record<string, number>;
}

function getPltrPriceOnDate(pltr: PltrData, dateStr: string): number | null {
  const target = dateStr.slice(0, 10);
  if (pltr.prices[target]) return pltr.prices[target];
  const dates = Object.keys(pltr.prices).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= target) return pltr.prices[dates[i]];
  }
  return dates.length > 0 ? pltr.prices[dates[0]] : null;
}

function Stats({ bets, cfg, pltr }: { bets: Bet[]; cfg: BettorConfig; pltr?: PltrData }) {
  const resolved = bets.filter((b) => b.result && b.result !== "pending");
  const wins = resolved.filter((b) => b.result === "won");
  const losses = resolved.filter((b) => b.result === "lost");
  const pushes = resolved.filter((b) => b.result === "push").length;
  const pending = bets.filter((b) => !b.result || b.result === "pending");
  const total = resolved.length;
  const pct = total > 0 ? ((wins.length / total) * 100).toFixed(0) : "—";

  let streak = 0;
  let streakType: "won" | "lost" | null = null;
  for (const b of resolved) {
    if (!streakType) {
      streakType = b.result === "won" ? "won" : b.result === "lost" ? "lost" : null;
      if (streakType) streak = 1;
    } else if (b.result === streakType) {
      streak++;
    } else {
      break;
    }
  }
  const streakLabel = streakType === "won" ? `${streak}W` : streakType === "lost" ? `${streak}L` : "—";

  let totalWon = 0;
  let totalLost = 0;
  let biggestWin = 0;
  let biggestWinDesc = "";
  let worstLoss = 0;
  let worstLossDesc = "";
  let pendingRisk = 0;

  for (const b of bets) {
    const stake = parseDollars(b.stake);
    const odds = parseOdds(b.odds);
    if (!stake) continue;
    if (b.result && b.result !== "pending") {
      if (b.result === "won" && odds) {
        const payout = calcPayout(stake, odds);
        totalWon += payout;
        if (payout > biggestWin) { biggestWin = payout; biggestWinDesc = b.description; }
      } else if (b.result === "lost") {
        totalLost += stake;
        if (stake > worstLoss) { worstLoss = stake; worstLossDesc = b.description; }
      }
    } else {
      pendingRisk += stake;
    }
  }

  const net = totalWon - totalLost;
  const netColor = net >= 0 ? "text-emerald-400" : "text-blood";
  const netLabel = net >= 0 ? "UP" : "DOWN";

  let pltrValue = 0;
  if (pltr) {
    for (const b of bets) {
      const stake = parseDollars(b.stake);
      if (!stake) continue;
      const priceAtBet = getPltrPriceOnDate(pltr, b.created_at);
      if (priceAtBet && priceAtBet > 0) {
        const shares = stake / priceAtBet;
        pltrValue += shares * pltr.current;
      }
    }
  }
  const totalBetMoney = totalWon + totalLost + pendingRisk;
  const pltrDiff = pltrValue - totalBetMoney;
  const pltrBetter = pltrValue > 0 && pltrDiff > net;

  return (
    <div className="space-y-3">
      {/* Row 1: Record stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Record", value: `${wins.length}-${losses.length}${pushes ? `-${pushes}` : ""}` },
          { label: "Win %", value: total > 0 ? `${pct}%` : "—" },
          { label: "Streak", value: streakLabel },
          { label: "Total Bets", value: String(bets.length) },
        ].map((s) => (
          <div key={s.label} className="panel p-3 text-center">
            <p className="kicker">{s.label}</p>
            <p className="font-display mt-1 text-xl text-gold-bright">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Money stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="panel p-3 text-center">
          <p className="kicker">Won</p>
          <p className="font-display mt-1 text-xl text-emerald-400">{totalWon > 0 ? `$${totalWon.toFixed(0)}` : "—"}</p>
        </div>
        <div className="panel p-3 text-center">
          <p className="kicker">Lost</p>
          <p className="font-display mt-1 text-xl text-blood">{totalLost > 0 ? `$${totalLost.toFixed(0)}` : "—"}</p>
        </div>
        <div className="panel p-3 text-center">
          <p className="kicker">At Stake</p>
          <p className="font-display mt-1 text-xl text-gold">{pendingRisk > 0 ? `$${pendingRisk.toFixed(0)}` : "—"}</p>
        </div>
        <div className={`panel border-2 p-3 text-center ${net >= 0 ? "border-emerald-500/40" : "border-blood/40"}`}>
          <p className="kicker">{netLabel}</p>
          <p className={`font-display mt-1 text-xl ${netColor}`}>
            {totalWon > 0 || totalLost > 0 ? `${net >= 0 ? "+" : "-"}$${Math.abs(net).toFixed(0)}` : "—"}
          </p>
        </div>
        <div className={`panel border-2 p-3 text-center ${pltrBetter ? "border-emerald-500/40" : "border-line"}`}>
          <p className="kicker">If PLTR</p>
          <p className={`font-display mt-1 text-xl ${pltrBetter ? "text-emerald-400" : "text-cream-dim"}`}>
            {pltrValue > 0 ? `$${pltrValue.toFixed(0)}` : "—"}
          </p>
          {pltrValue > 0 && (
            <p className={`mt-0.5 text-[0.6rem] font-semibold ${pltrBetter ? "text-emerald-400/70" : "text-cream-dim/60"}`}>
              {pltrBetter ? `+$${pltrDiff.toFixed(0)} vs betting` : "betting was better"}
            </p>
          )}
        </div>
      </div>

      {/* Damage Report details */}
      {(biggestWinDesc || worstLossDesc) && (
        <div className="panel p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {biggestWinDesc && (
              <div><p className="text-xs text-cream-dim">Biggest Win</p><p className="text-sm"><span className="font-head font-semibold text-emerald-400">+${biggestWin.toFixed(2)}</span><span className="ml-1.5 text-cream-dim">— {biggestWinDesc}</span></p></div>
            )}
            {worstLossDesc && (
              <div><p className="text-xs text-cream-dim">Worst Loss</p><p className="text-sm"><span className="font-head font-semibold text-blood">-${worstLoss.toFixed(2)}</span><span className="ml-1.5 text-cream-dim">— {worstLossDesc}</span></p></div>
            )}
          </div>
          {streakType === "lost" && streak >= 3 && (
            <p className="mt-3 rounded-sm border border-blood/30 bg-blood/10 px-3 py-2 text-center text-xs text-blood">
              {cfg.roasts.streakBanner.replace("{n}", String(streak))}
            </p>
          )}
          {streakType === "won" && streak >= 3 && (
            <p className="mt-3 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-400">
              {cfg.roasts.winStreakBanner.replace("{n}", String(streak))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LegGameTag({ ctx }: { ctx: GameContext }) {
  return (
    <span className="text-[10px] text-cream-dim/60">
      {ctx.awayAbbr} @ {ctx.homeAbbr} · {ctx.completed ? "Final" : ctx.state === "in" ? "Live" : new Date(ctx.gameTime).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}
    </span>
  );
}

function LegList({ betLegs, canVerify, canAdmin, legContexts, onResolveLeg }: {
  betLegs: Leg[];
  canVerify: boolean;
  canAdmin: boolean;
  legContexts: Map<number, GameContext>;
  onResolveLeg: (legId: number, result: string) => void;
}) {
  if (betLegs.length <= 1) return null;
  return (
    <div className="mt-2 space-y-1.5 border-t border-line pt-2">
      {betLegs.map((leg) => {
        const isPending = !leg.result || leg.result === "pending";
        const showGrade = canVerify && isPending;
        const showRegrade = canAdmin && !isPending;
        const legCtx = legContexts.get(leg.id);
        return (
          <div key={leg.id} className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-4 text-center ${
                leg.result === "won" ? "text-emerald-400" : leg.result === "lost" ? "text-blood" : "text-gold"
              }`}>
                {leg.result === "won" ? "✓" : leg.result === "lost" ? "✗" : "●"}
              </span>
              <span className={`flex-1 ${leg.result === "lost" ? "line-through text-cream-dim" : ""}`}>
                {leg.description}
              </span>
              {leg.odds && <span className="text-cream-dim">{leg.odds}</span>}
              {showGrade && (
                <div className="flex gap-1">
                  {(["won", "lost", "push"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => onResolveLeg(leg.id, r)}
                      className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream-dim hover:border-gold hover:text-cream">
                      {r === "won" ? "W" : r === "lost" ? "L" : "P"}
                    </button>
                  ))}
                </div>
              )}
              {showRegrade && (
                <div className="flex gap-1">
                  {(["won", "lost", "push"] as const).filter((r) => r !== leg.result).map((r) => (
                    <button key={r} type="button" onClick={() => onResolveLeg(leg.id, r)}
                      className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream-dim hover:border-gold hover:text-cream">
                      {r === "won" ? "W" : r === "lost" ? "L" : "P"}
                    </button>
                  ))}
                  <button type="button" onClick={() => onResolveLeg(leg.id, "pending")}
                    className="rounded-sm border border-gold-deep/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold hover:border-gold hover:text-gold-bright">
                    UNDO
                  </button>
                </div>
              )}
            </div>
            {legCtx && (
              <div className="ml-6">
                <LegGameTag ctx={legCtx} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GameBadge({ ctx }: { ctx: GameContext }) {
  const stateColor = ctx.completed
    ? "text-cream-dim"
    : ctx.state === "in"
      ? "text-gold-bright"
      : "text-cream-dim/80";
  return (
    <div className={`mt-1.5 flex items-center gap-1.5 rounded-sm border border-line/60 bg-felt-deep/40 px-2 py-1 text-[11px] ${stateColor}`}>
      <span className="font-bold uppercase tracking-wider opacity-60">{ctx.sport}</span>
      <span className="opacity-40">·</span>
      <span className="font-semibold text-cream">{ctx.awayAbbr} @ {ctx.homeAbbr}</span>
      <span className="opacity-40">·</span>
      <span>{ctx.completed ? "Final" : ctx.state === "in" ? "In Progress" : new Date(ctx.gameTime).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}</span>
    </div>
  );
}

function BetCard({ bet, canEdit, canVerify, canAdmin, roast, betLegs, gameCtx, legContexts, onUpdate, onRemove, onResolveLeg }: {
  bet: Bet; canEdit: boolean; canVerify: boolean; canAdmin: boolean; roast: string | null; betLegs: Leg[];
  gameCtx: GameContext | null; legContexts: Map<number, GameContext>;
  onUpdate: (id: number, result: Result) => void; onRemove: (id: number) => void;
  onResolveLeg: (legId: number, result: string) => void;
}) {
  const result = bet.result ?? "pending";
  const stake = parseDollars(bet.stake);
  const odds = parseOdds(bet.odds);
  const payout = stake && odds ? calcPayout(stake, odds) : null;
  const isParlay = betLegs.length > 1;

  return (
    <div className="panel flex gap-3 p-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border text-xs font-bold uppercase tracking-wider ${RESULT_STYLES[result]}`}>
        {RESULT_LABELS[result]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-head text-sm font-semibold leading-tight">{bet.description}</p>
          <p className="shrink-0 text-xs text-cream-dim">{fmtDate(bet.created_at)} · {fmtTime(bet.created_at)}</p>
        </div>
        {gameCtx && !isParlay && <GameBadge ctx={gameCtx} />}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream-dim">
          {bet.odds && <span>Odds: <span className="text-cream">{bet.odds}</span></span>}
          {bet.stake && <span>Stake: <span className="text-cream">{bet.stake}</span></span>}
          {payout !== null && result === "pending" && <span>To win: <span className="text-gold">${payout.toFixed(2)}</span></span>}
          {payout !== null && result === "won" && <span>Won: <span className="text-emerald-400">+${payout.toFixed(2)}</span></span>}
          {stake !== null && result === "lost" && <span>Lost: <span className="text-blood">-${stake.toFixed(2)}</span></span>}
          {bet.share_url && (
            <a href={bet.share_url} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">
              {isFanDuelLink(bet.share_url) ? "View on FanDuel ↗" : "Bet slip ↗"}
            </a>
          )}
        </div>
        {bet.note && <p className="mt-1.5 text-xs italic text-cream-dim">&ldquo;{bet.note}&rdquo;</p>}
        <LegList betLegs={betLegs} canVerify={canVerify} canAdmin={canAdmin} legContexts={legContexts} onResolveLeg={onResolveLeg} />
        {roast && (
          <p className={`mt-1.5 text-xs font-semibold ${result === "lost" ? "text-blood/80" : result === "won" ? "text-emerald-400/80" : "text-cream-dim/80"}`}>
            {roast}
          </p>
        )}
        {canEdit && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["won", "lost", "push", "cashout", "pending"] as Result[]).map((r) => (
              <button key={r} type="button" onClick={() => onUpdate(bet.id, r)}
                className={`rounded-sm border px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors ${result === r ? RESULT_STYLES[r] : "border-line text-cream-dim hover:border-gold hover:text-cream"}`}>
                {r}
              </button>
            ))}
            <button type="button" onClick={() => onRemove(bet.id)} className="ml-auto text-xs text-cream-dim hover:text-blood">delete</button>
          </div>
        )}
        <PostThread targetType="bet" targetId={bet.id} ownerId={bet.posted_by} ownerTitle={bet.description} />
      </div>
    </div>
  );
}

export default function BetBook({ bettor, tag, pltr, nflSlate, cfbData, rosters }: { bettor: BettorConfig; tag: string; pltr?: PltrData; nflSlate?: NflSlate; cfbData?: CfbData; rosters?: RosterLookup }) {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;

  const [bets, setBets] = useState<Bet[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [canPost, setCanPost] = useState(!supabase);
  const [canAdmin, setCanAdmin] = useState(!supabase);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [note, setNote] = useState("");
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  const parsed = parseBetInput(quickText);
  const preview = parsed.legs.length > 0;

  useEffect(() => {
    if (!supabase) return;
    supabase.from("bets").select("*").eq("bettor_tag", tag).order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setBets((data as Bet[]) ?? []);
      });
    supabase.from("bet_legs").select("*").order("leg_order")
      .then(({ data }) => setLegs((data as Leg[]) ?? []));
  }, [supabase, version, tag]);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from("members").select("is_commissioner, espn_owner_id").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        const ownerId = data?.espn_owner_id ?? "";
        const isBettor = bettor.espnOwnerIds.includes(ownerId);
        const isComm = Boolean(data?.is_commissioner);
        const isEthan = ownerId === "{63997D52-0196-4BC4-B322-161E7342C352}";
        const isNishok = ownerId === "{C2489537-0A8B-4E67-9914-7A2C71341A12}";
        setCanPost(isBettor || isComm);
        setCanAdmin(isComm || isEthan || isNishok);
      });
  }, [supabase, user, bettor.espnOwnerIds]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!myId || parsed.legs.length === 0) return;
    setBusy(true);
    setError(null);

    const description = parsed.type === "parlay"
      ? `${parsed.legs.length}-Leg Parlay`
      : parsed.legs[0]?.description ?? "";
    const odds = parsed.type === "parlay" ? parsed.combinedOdds : parsed.legs[0]?.odds ?? null;

    const betRow = {
      description,
      share_url: shareUrl.trim() || null,
      odds,
      stake: parsed.stake,
      note: note.trim() || null,
      result: "pending" as const,
      posted_by: myId,
      bettor_tag: tag,
      bet_type: parsed.type,
      combined_odds: parsed.combinedOdds,
      verified_by: null,
    };

    if (!supabase) {
      const newId = Date.now();
      setBets((bs) => [{ id: newId, created_at: new Date().toISOString(), ...betRow }, ...bs]);
      setLegs((ls) => [
        ...ls,
        ...parsed.legs.map((leg, i) => ({
          id: newId * 1000 + i,
          bet_id: newId,
          leg_order: i + 1,
          description: leg.description,
          market_type: leg.marketType,
          team_abbr: leg.teamAbbr,
          odds: leg.odds,
          result: "pending" as const,
          resolved_by: null,
        })),
      ]);
    } else {
      const { data: newBet, error: betErr } = await supabase
        .from("bets").insert(betRow).select("id").single();
      if (betErr || !newBet) {
        setError(betErr?.message ?? "Failed to log bet");
        setBusy(false);
        return;
      }
      const legRows = parsed.legs.map((leg, i) => ({
        bet_id: newBet.id,
        leg_order: i + 1,
        description: leg.description,
        market_type: leg.marketType,
        team_abbr: leg.teamAbbr,
        odds: leg.odds,
        result: "pending",
      }));
      const { error: legErr } = await supabase.from("bet_legs").insert(legRows);
      if (legErr) setError(legErr.message);
      reload();
    }
    setQuickText("");
    setShareUrl("");
    setNote("");
    setShowForm(false);
    setBusy(false);
  }

  async function updateResult(id: number, result: Result) {
    if (!supabase || !myId) return;
    const { error: err } = await supabase.from("bets").update({ result }).eq("id", id);
    if (err) setError(err.message);
    else setBets((bs) => bs.map((b) => (b.id === id ? { ...b, result } : b)));
  }

  async function resolveLeg(legId: number, result: string) {
    if (!supabase || !user) return;
    const isUndo = result === "pending";
    const { error: err } = await supabase
      .from("bet_legs")
      .update({
        result: isUndo ? null : result,
        resolved_by: isUndo ? null : user.id,
        resolved_at: isUndo ? null : new Date().toISOString(),
      })
      .eq("id", legId);
    if (err) { setError(err.message); return; }
    setLegs((ls) => ls.map((l) => (l.id === legId ? { ...l, result: isUndo ? null : result, resolved_by: isUndo ? null : user.id } : l)));
    reload();
  }

  async function removeBet(id: number) {
    if (!supabase) return;
    setBets((bs) => bs.filter((b) => b.id !== id));
    const { error: err } = await supabase.from("bets").delete().eq("id", id);
    if (err) { setError(err.message); reload(); }
  }

  const input = "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";
  const pending = bets.filter((b) => !b.result || b.result === "pending");
  const resolved = bets.filter((b) => b.result && b.result !== "pending");

  const defaultSlate: NflSlate = { season: 0, currentWeek: 0, weeks: {} };
  const defaultCfb: CfbData = { season: 0, week: 0, thisWeek: [], lastWeek: [] };
  const defaultRosters: RosterLookup = { players: {} };
  const sl = nflSlate ?? defaultSlate;
  const cf = cfbData ?? defaultCfb;
  const rs = rosters ?? defaultRosters;

  function getGameCtx(bet: Bet): GameContext | null {
    const betLegs = legs.filter((l) => l.bet_id === bet.id);
    return findGameForBet(
      { description: bet.description, created_at: bet.created_at },
      betLegs.map((l) => ({ description: l.description, team_abbr: l.team_abbr })),
      sl, cf, rs,
    );
  }

  function getLegContexts(betLegs: Leg[], betDate: string): Map<number, GameContext> {
    const map = new Map<number, GameContext>();
    for (const leg of betLegs) {
      const ctx = findGameForLeg(leg.description, leg.team_abbr, sl, cf, rs, betDate);
      if (ctx) map.set(leg.id, ctx);
    }
    return map;
  }

  return (
    <section className="space-y-6">
      <Stats bets={bets} cfg={bettor} pltr={pltr} />
      {canPost && !showForm && (
        <button type="button" onClick={() => setShowForm(true)}
          className="font-head w-full rounded-sm border border-dashed border-gold-deep px-4 py-3 text-sm font-bold uppercase tracking-widest text-gold hover:border-gold hover:bg-gold/10">
          + Log a bet
        </button>
      )}
      {canPost && showForm && (
        <form onSubmit={submit} className="panel space-y-3 p-4">
          <p className="kicker">Quick log</p>
          <textarea
            required
            autoFocus
            rows={1}
            placeholder="Chiefs ML +150 $25 — or one leg per line for a parlay"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = t.scrollHeight + "px";
            }}
            className={`${input} text-base resize-none`}
          />
          {preview && (
            <div className="space-y-2 rounded-sm border border-line bg-felt-deep/40 px-3 py-2 text-xs">
              {parsed.legs.map((leg, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold text-cream">{leg.description || "…"}</span>
                  <span className={`font-semibold ${leg.odds ? "text-cream" : "text-cream-dim"}`}>{leg.odds ?? "no odds"}</span>
                </div>
              ))}
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line/60 pt-2">
                <span>Stake: <span className={`font-semibold ${parsed.stake ? "text-cream" : "text-cream-dim"}`}>{parsed.stake ?? "none"}</span></span>
                {parsed.type === "parlay" && (
                  <span>Combined odds: <span className={`font-semibold ${parsed.combinedOdds ? "text-cream" : "text-cream-dim"}`}>{parsed.combinedOdds ?? "—"}</span></span>
                )}
                {parsed.potentialPayout !== null && (
                  <span>To win: <span className="font-semibold text-gold">${parsed.potentialPayout.toFixed(2)}</span></span>
                )}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="FanDuel link (optional)" value={shareUrl} onChange={(e) => setShareUrl(e.target.value)} className={input} />
            <input placeholder="Trash talk (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
          </div>
          {error && <p className="text-sm text-blood">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy || parsed.legs.length === 0} className="font-head flex-1 rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40">Lock it in</button>
            <button type="button" onClick={() => { setShowForm(false); setQuickText(""); setShareUrl(""); setNote(""); }} className="font-head rounded-sm border border-line px-4 py-2 text-sm uppercase tracking-wider text-cream-dim hover:text-cream">Cancel</button>
          </div>
        </form>
      )}
      {!canPost && error && <p className="text-sm text-blood">{error}</p>}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="kicker">Live bets · {pending.length}</p>
          {pending.map((b) => {
            const bl = legs.filter((l) => l.bet_id === b.id);
            return (
              <BetCard key={b.id} bet={b} canEdit={canPost || canAdmin} canVerify={Boolean(user) && b.posted_by !== myId} canAdmin={canAdmin}
                betLegs={bl} roast={getRoast(b, 0, bettor)} gameCtx={getGameCtx(b)}
                legContexts={getLegContexts(bl, b.created_at)}
                onUpdate={updateResult} onRemove={removeBet} onResolveLeg={resolveLeg} />
            );
          })}
        </div>
      )}
      {resolved.length > 0 && (
        <div className="space-y-2">
          <p className="kicker">Settled · {resolved.length}</p>
          {resolved.map((b, i) => {
            const bl = legs.filter((l) => l.bet_id === b.id);
            return (
              <BetCard key={b.id} bet={b} canEdit={canPost || canAdmin} canVerify={Boolean(user) && b.posted_by !== myId} canAdmin={canAdmin}
                betLegs={bl} roast={getRoast(b, computeLossStreakAt(resolved, i), bettor)} gameCtx={getGameCtx(b)}
                legContexts={getLegContexts(bl, b.created_at)}
                onUpdate={updateResult} onRemove={removeBet} onResolveLeg={resolveLeg} />
            );
          })}
        </div>
      )}
      {bets.length === 0 && !error && (
        <div className="panel flex min-h-40 items-center justify-center p-6 text-center">
          <p className="text-sm text-cream-dim">{bettor.emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
