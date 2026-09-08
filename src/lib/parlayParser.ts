export type MarketType = "moneyline" | "spread" | "over_under" | "prop" | "other";

export interface ParsedLeg {
  description: string;
  odds: string | null;
  marketType: MarketType;
  teamAbbr: string | null;
}

export interface ParsedBet {
  type: "single" | "parlay";
  legs: ParsedLeg[];
  stake: string | null;
  combinedOdds: string | null;
  potentialPayout: number | null;
}

const NFL_ABBRS = new Set([
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN",
  "DET","GB","HOU","IND","JAX","KC","LAC","LAR","LV","MIA",
  "MIN","NE","NO","NYG","NYJ","PHI","PIT","SEA","SF","TB","TEN","WSH",
]);

function parseOddsFromText(text: string): { cleaned: string; odds: string | null } {
  let odds: string | null = null;
  let cleaned = text;
  const oddsMatch = cleaned.match(/(?:^|\s)([+-]\d{3,})\b/);
  if (oddsMatch) {
    odds = oddsMatch[1];
    cleaned = cleaned.replace(oddsMatch[0], "");
  }
  if (!odds) {
    const shortMatch = cleaned.match(/(?:^|\s)(-\d{2,3})\b/);
    if (shortMatch) {
      odds = shortMatch[1];
      cleaned = cleaned.replace(shortMatch[0], "");
    }
  }
  return { cleaned: cleaned.replace(/\s{2,}/g, " ").trim(), odds };
}

function detectMarketType(desc: string): MarketType {
  const d = desc.toLowerCase();
  if (/\bml\b|moneyline/i.test(d)) return "moneyline";
  if (/\b(over|under|o|u)\s*\d/i.test(d)) return "over_under";
  if (/[+-]\d{1,2}\.?5?\s/i.test(d) || /spread/i.test(d)) return "spread";
  if (/\b(td|touchdown|yard|passing|rushing|receiving|sack|int|reception)\b/i.test(d)) return "prop";
  const words = desc.replace(/[+-]\d+/g, "").trim().split(/\s+/);
  if (words.length <= 2 && words.some((w) => NFL_ABBRS.has(w.toUpperCase()))) return "moneyline";
  return "other";
}

function detectTeamAbbr(desc: string): string | null {
  const words = desc.toUpperCase().split(/\s+/);
  for (const w of words) {
    if (NFL_ABBRS.has(w)) return w;
  }
  return null;
}

function parseLeg(line: string): ParsedLeg {
  const { cleaned, odds } = parseOddsFromText(line);
  return {
    description: cleaned,
    odds,
    marketType: detectMarketType(cleaned),
    teamAbbr: detectTeamAbbr(cleaned),
  };
}

function oddsToImplied(american: string): number {
  const n = parseFloat(american);
  if (isNaN(n)) return 0.5;
  return n > 0 ? 100 / (n + 100) : Math.abs(n) / (Math.abs(n) + 100);
}

function impliedToAmerican(prob: number): string {
  if (prob <= 0 || prob >= 1) return "+100";
  if (prob >= 0.5) return `-${Math.round((prob / (1 - prob)) * 100)}`;
  return `+${Math.round(((1 - prob) / prob) * 100)}`;
}

function calcPayout(stake: number, americanOdds: number): number {
  if (americanOdds > 0) return stake * (americanOdds / 100);
  if (americanOdds < 0) return stake * (100 / Math.abs(americanOdds));
  return 0;
}

export function parseBetInput(raw: string): ParsedBet {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { type: "single", legs: [], stake: null, combinedOdds: null, potentialPayout: null };

  let stake: string | null = null;
  const legLines: string[] = [];

  for (const line of lines) {
    const stakeOnly = line.match(/^\$\s?(\d+(?:\.\d{1,2})?)$/);
    if (stakeOnly && !stake) {
      stake = `$${stakeOnly[1]}`;
    } else {
      legLines.push(line);
    }
  }

  // Single-line: extract inline stake.
  if (legLines.length === 1 && !stake) {
    const inlineStake = legLines[0].match(/\$\s?(\d+(?:\.\d{1,2})?)/);
    if (inlineStake) {
      stake = `$${inlineStake[1]}`;
      legLines[0] = legLines[0].replace(inlineStake[0], "").trim();
    }
  }

  const legs = legLines.map(parseLeg).filter((l) => l.description.length > 0);
  const type = legs.length > 1 ? "parlay" : "single";

  let combinedOdds: string | null = null;
  let potentialPayout: number | null = null;

  if (type === "parlay" && legs.every((l) => l.odds)) {
    const combined = legs.reduce((prob, l) => prob * oddsToImplied(l.odds!), 1);
    combinedOdds = impliedToAmerican(combined);
    if (stake) {
      const s = parseFloat(stake.replace("$", ""));
      const o = parseFloat(combinedOdds);
      if (!isNaN(s) && !isNaN(o)) potentialPayout = calcPayout(s, o);
    }
  } else if (type === "single" && legs[0]?.odds && stake) {
    const s = parseFloat(stake.replace("$", ""));
    const o = parseFloat(legs[0].odds);
    if (!isNaN(s) && !isNaN(o)) potentialPayout = calcPayout(s, o);
  }

  return { type, legs, stake, combinedOdds, potentialPayout };
}
