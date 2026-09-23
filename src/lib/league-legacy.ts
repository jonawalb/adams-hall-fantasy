import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "league-legacy.json");

export interface StandingEntry {
  rank: number;
  name: string;
  seasons: string;
  num_seasons: number;
  record: string;
  wins: number;
  losses: number;
  win_pct: number;
  all_play_record: string;
  all_play_win_pct: number;
  league_rating: number;
  trophies: { champion?: number; runner_up?: number; third?: number };
}

export interface PlayoffEntry {
  rank: number;
  name: string;
  playoff_appearances: string;
  num_appearances: number;
  record: string;
  win_pct: number;
  medals: number;
  medal_score: number;
  trophies: { champion?: number; runner_up?: number; third?: number };
}

export interface AdvancedEntry {
  rank: number;
  name: string;
  draft_rank: string | null;
  manager_rank: string | null;
  coach_rank: string | null;
  top_score_pct: number;
  records_held: number;
  achievements: number;
  points_share_avg: number;
  avg_season_score: number;
}

export interface SeasonChampion {
  year: number;
  champion: string;
  runner_up: string;
  third: string;
  in_season_champ: string;
  points_champ: string;
  all_play_champ: string;
}

export interface SeasonChumpion {
  year: number;
  last_place: string;
  in_season_last: string;
  lowest_scorer: string;
  worst_all_around: string;
}

export interface DraftRanking {
  rank: number;
  name: string;
  value: number;
}

export interface AchievementEntry {
  name: string;
  achievements: number;
  achievements_total: number;
  blunders: number;
  blunders_total: number;
  total_unique: number;
  total_badges: number;
}

export interface PlayoffExpectedWin {
  name: string;
  actual_w: number;
  expected_w: number;
  diff: number;
}

export interface ChampionshipDrought {
  name: string;
  status: string;
  seasons?: number;
}

export interface LeagueLegacyData {
  all_time_standings: StandingEntry[];
  playoff_standings: PlayoffEntry[];
  advanced_standings: AdvancedEntry[];
  season_champions: SeasonChampion[];
  season_chumpions: SeasonChumpion[];
  draft_rankings: DraftRanking[];
  achievements_summary: AchievementEntry[];
  playoff_expected_wins: PlayoffExpectedWin[];
  championship_droughts: ChampionshipDrought[];
  head_to_head: Record<string, Record<string, string>>;
  versus_records: Record<string, string>;
  transaction_stats: {
    total_waiver_moves: number;
    total_trades: number;
    total_transactions: number;
    waiver_rankings: { rank: number; name: string; value: number }[];
    manager_rankings: { rank: number; name: string; value: number }[];
  };
  draft_records: {
    avg_pick_value: number;
    avg_team_value: number;
    avg_season_value: number;
    top_picks_all_time: { player: string; position: string; team: string; year: number; round_pick: string; value: number; franchise: string }[];
    worst_picks_all_time: { player: string; position: string; team: string; year: number; round_pick: string; value: number; franchise: string }[];
  };
  playoff_scoring: { name: string; total_pts: number; avg_per_season: number }[];
  playoff_records: Record<string, { value?: number; holder?: string; year?: number; description?: string }>;
  playoff_appearance_streaks: { name: string; streak: number; seasons: string; active?: boolean }[];
  record_book_holders: { rank: number; name: string; positive_held: number; negative_held: number; total_held: number }[];
}

let cached: LeagueLegacyData | null = null;

export function loadLeagueLegacy(): LeagueLegacyData {
  if (cached) return cached;
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  cached = JSON.parse(raw) as LeagueLegacyData;
  return cached;
}
