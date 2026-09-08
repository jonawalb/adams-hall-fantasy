// Supabase Edge Function: auto-resolve pending bet legs using ESPN NFL scores.
// Called every 15 minutes by pg_cron via pg_net.
// For legs it can't resolve (props, no team match), sends targeted push
// notifications to the verification crew (everyone except the bettor).

import { createClient } from "npm:@supabase/supabase-js@2";

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

interface EspnGame {
  id: string;
  completed: boolean;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  homeWinner: boolean;
  awayWinner: boolean;
  total: number;
}

async function fetchScoreboard(): Promise<EspnGame[]> {
  const res = await fetch(ESPN_SCOREBOARD);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events ?? []).map((e: any) => {
    const c = e.competitions[0];
    const home = c.competitors.find((x: any) => x.homeAway === "home");
    const away = c.competitors.find((x: any) => x.homeAway === "away");
    return {
      id: e.id,
      completed: Boolean(c.status?.type?.completed),
      homeAbbr: home?.team?.abbreviation ?? "",
      awayAbbr: away?.team?.abbreviation ?? "",
      homeScore: Number(home?.score ?? 0),
      awayScore: Number(away?.score ?? 0),
      homeWinner: Boolean(home?.winner),
      awayWinner: Boolean(away?.winner),
      total: Number(home?.score ?? 0) + Number(away?.score ?? 0),
    };
  });
}

function findGame(games: EspnGame[], leg: any): EspnGame | null {
  if (leg.event_id) return games.find((g) => g.id === leg.event_id) ?? null;
  if (leg.team_abbr) {
    const abbr = leg.team_abbr.toUpperCase();
    return games.find((g) => g.homeAbbr === abbr || g.awayAbbr === abbr) ?? null;
  }
  return null;
}

function resolveLeg(
  leg: any,
  game: EspnGame,
): "won" | "lost" | "push" | null {
  const abbr = (leg.team_abbr ?? "").toUpperCase();
  const isHome = game.homeAbbr === abbr;
  const teamWon = isHome ? game.homeWinner : game.awayWinner;
  const teamScore = isHome ? game.homeScore : game.awayScore;
  const oppScore = isHome ? game.awayScore : game.homeScore;

  switch (leg.market_type) {
    case "moneyline":
      return teamWon ? "won" : "lost";

    case "spread": {
      const line = Number(leg.line);
      if (isNaN(line)) return null;
      const adjusted = teamScore + line;
      if (adjusted > oppScore) return "won";
      if (adjusted < oppScore) return "lost";
      return "push";
    }

    case "over_under": {
      const line = Number(leg.line);
      if (isNaN(line)) return null;
      const desc = (leg.description ?? "").toLowerCase();
      const isOver = desc.includes("over") || desc.startsWith("o ");
      if (game.total > line) return isOver ? "won" : "lost";
      if (game.total < line) return isOver ? "lost" : "won";
      return "push";
    }

    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Load pending legs with their parent bet info.
  const { data: pendingLegs } = await admin
    .from("bet_legs")
    .select("*, bets!inner(id, posted_by, bettor_tag)")
    .or("result.is.null,result.eq.pending");

  if (!pendingLegs || pendingLegs.length === 0) {
    return Response.json({ message: "no pending legs", resolved: 0 });
  }

  const games = await fetchScoreboard();
  if (games.length === 0) {
    return Response.json({ message: "no games on scoreboard", resolved: 0 });
  }

  let resolved = 0;
  const needsVerification: any[] = [];

  for (const leg of pendingLegs) {
    const game = findGame(games, leg);
    if (!game || !game.completed) continue;

    const result = resolveLeg(leg, game);
    if (result) {
      await admin
        .from("bet_legs")
        .update({ result, resolved_at: new Date().toISOString() })
        .eq("id", leg.id);
      resolved++;
    } else {
      needsVerification.push(leg);
    }
  }

  // Send targeted notifications for legs needing manual verification.
  if (needsVerification.length > 0) {
    const { data: allMembers } = await admin
      .from("members")
      .select("id, display_name");

    for (const leg of needsVerification) {
      const bet = leg.bets;
      const bettorId = bet.posted_by;
      const verifiers = (allMembers ?? [])
        .filter((m: any) => m.id !== bettorId)
        .map((m: any) => m.id);

      const bettorName = (allMembers ?? []).find(
        (m: any) => m.id === bettorId,
      )?.display_name ?? "Someone";
      const tag = bet.bettor_tag ?? "jorge";

      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          title: "Verify Bet",
          body: `${bettorName}: ${leg.description} — game over, needs W/L`,
          url: `/betting/${tag}s-book/`,
          member_ids: verifiers,
        }),
      });
    }
  }

  return Response.json({ resolved, needsVerification: needsVerification.length });
});
