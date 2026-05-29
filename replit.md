# GoalWire — Football Discord Bot

A Discord bot that delivers live football scores, standings, fixtures, and real-time goal alerts powered by the football-data.org API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Discord bot (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `FOOTBALL_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Discord: discord.js v14
- Football data: football-data.org API v4
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/bot/` — Discord bot (commands, alerts, reminders)
- `artifacts/api-server/src/bot/commands/` — one file per slash command
- `artifacts/api-server/src/bot/alerts.ts` — live goal/HT/FT polling & channel alerts
- `artifacts/api-server/src/bot/reminders.ts` — personal DM kickoff reminders
- `artifacts/api-server/src/services/football.ts` — football-data.org API client
- `artifacts/api-server/data/` — persisted alert channel configs and reminders (JSON)

## Bot Commands (12 total)

| Command | Description |
|---|---|
| `/scores [date]` | Today's results or any date (YYYY-MM-DD) |
| `/live` | Live matches with match timers |
| `/matchday league [round]` | Full matchday schedule, auto-detects current round |
| `/standings league` | Full league table |
| `/table league [view]` | Focused snapshot: title race, relegation zone etc. |
| `/top league [limit]` | Top scorers with goals, assists, appearances |
| `/team name` | Team info + last 5 results |
| `/fixtures team` | Next 10 upcoming matches |
| `/player name team` | Player details from squad |
| `/setalerts add/remove/leagues/list` | Configure channel alerts with league filters |
| `/remind set/list/cancel` | Personal DM reminders 15 min before kickoff |
| `/compare team1 team2` | Side-by-side stats: form, goals, clean sheets |

## Architecture decisions

- Bot starts alongside the Express server in `src/index.ts` via `startBot()`
- Slash commands auto-register with Discord on every startup (global commands)
- Alert polling runs every 60s, detects goals/HT/FT by diffing match state
- Per-channel alert config supports league filtering (empty = all leagues)
- Reminders persist to `data/reminders.json` and survive restarts
- `bufferutil` and `utf-8-validate` are externalized in esbuild (discord.js optional deps)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- football-data.org free tier covers: PL, BL1, PD, SA, FL1, CL, EL, WC, EC, ELC, DED, PPL, BSA
- Slash command changes take up to 1 hour to propagate globally in Discord
- Users need DMs open from server members for `/remind` to work
- Always run `pnpm --filter @workspace/api-server run typecheck` before restarting
