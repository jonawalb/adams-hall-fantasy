export interface GameContext {
  sport: "NFL" | "CFB";
  away: string;
  awayAbbr: string;
  home: string;
  homeAbbr: string;
  gameTime: string;
  label: string;
  completed: boolean;
  state: string;
}

interface SlateTeam {
  abbr: string;
  name: string;
  short?: string;
}

interface SlateGame {
  id: string;
  date: string;
  name: string;
  state: string;
  completed: boolean;
  detail: string;
  home: SlateTeam;
  away: SlateTeam;
}

export interface NflSlate {
  season: number;
  currentWeek: number;
  weeks: Record<string, { season: number; week: number; games: SlateGame[] }>;
}

export interface CfbData {
  season: number;
  week: number;
  thisWeek: SlateGame[];
  lastWeek: SlateGame[];
}

export interface RosterLookup {
  players: Record<string, string>;
}

const NFL_NAMES: Record<string, string> = {
  cardinals: "ARI", arizona: "ARI",
  falcons: "ATL", atlanta: "ATL",
  ravens: "BAL", baltimore: "BAL",
  bills: "BUF", buffalo: "BUF",
  panthers: "CAR", carolina: "CAR",
  bears: "CHI", chicago: "CHI",
  bengals: "CIN", cincinnati: "CIN",
  browns: "CLE", cleveland: "CLE",
  cowboys: "DAL", dallas: "DAL",
  broncos: "DEN", denver: "DEN",
  lions: "DET", detroit: "DET",
  packers: "GB", "green bay": "GB",
  texans: "HOU", houston: "HOU",
  colts: "IND", indianapolis: "IND",
  jaguars: "JAX", jags: "JAX", jacksonville: "JAX",
  chiefs: "KC", "kansas city": "KC",
  chargers: "LAC",
  rams: "LAR",
  raiders: "LV", "las vegas": "LV",
  dolphins: "MIA", miami: "MIA",
  vikings: "MIN", minnesota: "MIN",
  patriots: "NE", pats: "NE", "new england": "NE",
  saints: "NO", "new orleans": "NO",
  giants: "NYG",
  jets: "NYJ",
  eagles: "PHI", philadelphia: "PHI", philly: "PHI",
  steelers: "PIT", pittsburgh: "PIT",
  seahawks: "SEA", seattle: "SEA",
  "49ers": "SF", niners: "SF", "9ers": "SF", "san francisco": "SF",
  buccaneers: "TB", bucs: "TB", "tampa bay": "TB", tampa: "TB",
  titans: "TEN", tennessee: "TEN",
  commanders: "WSH", washington: "WSH",
};

const NFL_ABBRS = new Set([
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN",
  "DET","GB","HOU","IND","JAX","KC","LAC","LAR","LV","MIA",
  "MIN","NE","NO","NYG","NYJ","PHI","PIT","SEA","SF","TB","TEN","WSH",
]);

function allNflGames(slate: NflSlate): SlateGame[] {
  const games: SlateGame[] = [];
  for (const week of Object.values(slate.weeks)) {
    games.push(...week.games);
  }
  return games;
}

function allCfbGames(cfb: CfbData): SlateGame[] {
  return [...(cfb.thisWeek ?? []), ...(cfb.lastWeek ?? [])];
}

function findNflGameByAbbr(abbr: string, games: SlateGame[]): SlateGame | null {
  const upper = abbr.toUpperCase();
  return games.find((g) => g.home.abbr === upper || g.away.abbr === upper) ?? null;
}

function findNflGameByAbbrNearest(abbr: string, games: SlateGame[], betDate: string): SlateGame | null {
  const upper = abbr.toUpperCase();
  const matches = games.filter((g) => g.home.abbr === upper || g.away.abbr === upper);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  const bet = new Date(betDate).getTime();
  matches.sort((a, b) => {
    const da = Math.abs(new Date(a.date).getTime() - bet);
    const db = Math.abs(new Date(b.date).getTime() - bet);
    return da - db;
  });
  return matches[0];
}

function resolveAbbrFromName(desc: string): string | null {
  const lower = desc.toLowerCase();
  const sortedKeys = Object.keys(NFL_NAMES).sort((a, b) => b.length - a.length);
  for (const name of sortedKeys) {
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower)) return NFL_NAMES[name];
  }
  const words = desc.toUpperCase().split(/\s+/);
  for (const w of words) {
    if (NFL_ABBRS.has(w)) return w;
  }
  return null;
}

function resolveAbbrFromRosters(desc: string, rosters: RosterLookup): string | null {
  if (!rosters?.players) return null;
  const names = Object.keys(rosters.players).sort((a, b) => b.length - a.length);
  const lower = desc.toLowerCase();
  for (const name of names) {
    if (lower.includes(name.toLowerCase())) {
      return rosters.players[name];
    }
  }
  return null;
}

function findCfbGame(desc: string, games: SlateGame[]): SlateGame | null {
  const lower = desc.toLowerCase();
  const scored: { game: SlateGame; len: number }[] = [];
  for (const g of games) {
    const candidates = [
      g.home.name, g.home.short, g.home.abbr,
      g.away.name, g.away.short, g.away.abbr,
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      if (c.length < 3) continue;
      if (lower.includes(c.toLowerCase())) {
        scored.push({ game: g, len: c.length });
      }
    }
  }
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.len - a.len);
  return scored[0].game;
}

function formatLabel(game: SlateGame, sport: "NFL" | "CFB"): string {
  const d = new Date(game.date);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  const away = game.away.abbr;
  const home = game.home.abbr;

  if (game.completed) {
    return `${sport} · ${away} @ ${home} · Final`;
  }
  if (game.state === "in") {
    return `${sport} · ${away} @ ${home} · In Progress`;
  }
  return `${sport} · ${away} @ ${home} · ${day} ${time}`;
}

function toContext(game: SlateGame, sport: "NFL" | "CFB"): GameContext {
  return {
    sport,
    away: game.away.name,
    awayAbbr: game.away.abbr,
    home: game.home.name,
    homeAbbr: game.home.abbr,
    gameTime: game.date,
    label: formatLabel(game, sport),
    completed: game.completed,
    state: game.state,
  };
}

export function findGameForLeg(
  description: string,
  teamAbbr: string | null,
  nflSlate: NflSlate,
  cfbData: CfbData,
  rosters: RosterLookup,
  betDate?: string,
): GameContext | null {
  const nflGames = allNflGames(nflSlate);
  const cfbGames = allCfbGames(cfbData);

  if (teamAbbr) {
    const upper = teamAbbr.toUpperCase();
    if (NFL_ABBRS.has(upper)) {
      const game = betDate
        ? findNflGameByAbbrNearest(upper, nflGames, betDate)
        : findNflGameByAbbr(upper, nflGames);
      if (game) return toContext(game, "NFL");
    }
  }

  const rosterAbbr = resolveAbbrFromRosters(description, rosters);
  if (rosterAbbr) {
    const game = betDate
      ? findNflGameByAbbrNearest(rosterAbbr, nflGames, betDate)
      : findNflGameByAbbr(rosterAbbr, nflGames);
    if (game) return toContext(game, "NFL");
  }

  const nameAbbr = resolveAbbrFromName(description);
  if (nameAbbr) {
    const game = betDate
      ? findNflGameByAbbrNearest(nameAbbr, nflGames, betDate)
      : findNflGameByAbbr(nameAbbr, nflGames);
    if (game) return toContext(game, "NFL");
  }

  const cfbGame = findCfbGame(description, cfbGames);
  if (cfbGame) return toContext(cfbGame, "CFB");

  return null;
}

export function findGameForBet(
  bet: { description: string; created_at: string },
  legs: { description: string; team_abbr: string | null }[],
  nflSlate: NflSlate,
  cfbData: CfbData,
  rosters: RosterLookup,
): GameContext | null {
  for (const leg of legs) {
    const ctx = findGameForLeg(leg.description, leg.team_abbr, nflSlate, cfbData, rosters, bet.created_at);
    if (ctx) return ctx;
  }
  return findGameForLeg(bet.description, null, nflSlate, cfbData, rosters, bet.created_at);
}
