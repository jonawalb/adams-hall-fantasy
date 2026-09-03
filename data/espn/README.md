# ESPN archive

Everything here is fetched from ESPN's fantasy API for league 833808174 and
committed nightly by the deploy workflow (06:00 UTC, 2am EDT). ESPN only keeps
transactions, the activity feed, and lineups for the season in progress, so
this folder is the league's permanent record.

| File | Contents | Written by |
|---|---|---|
| `season-YYYY.json` | Teams, members, settings, standings, matchup scores (raw ESPN views) | `scripts/fetch-espn.mjs` (2021–2024 need `ESPN_S2`/`SWID`) |
| `transactions-YYYY.json` | Every waiver, trade, add, drop, and draft pick as a transaction; merged by id | `scripts/archive-espn.mjs` |
| `draft-YYYY.json` | Draft picks in order | `scripts/archive-espn.mjs` |
| `activity-YYYY.json` | League activity feed topics (trade proposals, settings changes, chat); merged by id | `scripts/archive-espn.mjs` |
| `players-YYYY.json` | `playerId → { name, pos, proTeamId }` so ids stay readable | `scripts/archive-espn.mjs` |
| `boxscores/YYYY-wkNN.json` | Every matchup's full lineup (starters + bench) with points for that scoring period; past weeks are frozen | `scripts/archive-espn.mjs` |

Run a backfill locally with `node scripts/archive-espn.mjs 2025 2026`.
Nothing here is ever deleted by the scripts; merges only add or update.
