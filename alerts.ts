import { type Client, EmbedBuilder, Colors, TextChannel } from "discord.js";
import { getLiveMatches, formatMinute, type Match } from "../services/football.js";
import { logger } from "../lib/logger.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const CHANNELS_FILE = path.resolve(DATA_DIR, "alert-channels.json");

const POLL_INTERVAL_MS = 60_000;

// Per-channel config: empty leagues array = all leagues
interface ChannelConfig {
  leagues: string[]; // competition codes, e.g. ["PL", "CL"]
}

interface AlertConfig {
  [channelId: string]: ChannelConfig;
}

interface MatchState {
  homeScore: number;
  awayScore: number;
  status: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  competitionCode: string;
}

const matchStates = new Map<number, MatchState>();
let alertConfig: AlertConfig = {};
let pollingTimer: ReturnType<typeof setInterval> | null = null;

export async function loadAlertChannels(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(CHANNELS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    // Migrate old format (plain array) to new format (object)
    if (Array.isArray(parsed)) {
      alertConfig = {};
      for (const id of parsed as string[]) {
        alertConfig[id] = { leagues: [] };
      }
      await saveAlertChannels();
    } else {
      alertConfig = parsed as AlertConfig;
    }

    logger.info({ count: Object.keys(alertConfig).length }, "Loaded alert channels");
  } catch {
    alertConfig = {};
  }
}

export async function saveAlertChannels(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CHANNELS_FILE, JSON.stringify(alertConfig, null, 2), "utf-8");
}

export async function addAlertChannel(channelId: string): Promise<boolean> {
  if (alertConfig[channelId]) return false;
  alertConfig[channelId] = { leagues: [] };
  await saveAlertChannels();
  return true;
}

export async function removeAlertChannel(channelId: string): Promise<boolean> {
  if (!alertConfig[channelId]) return false;
  delete alertConfig[channelId];
  await saveAlertChannels();
  return true;
}

export async function setChannelLeagues(
  channelId: string,
  leagues: string[]
): Promise<boolean> {
  if (!alertConfig[channelId]) return false;
  alertConfig[channelId]!.leagues = leagues;
  await saveAlertChannels();
  return true;
}

export function getAlertChannels(): Array<{ channelId: string; leagues: string[] }> {
  return Object.entries(alertConfig).map(([channelId, cfg]) => ({
    channelId,
    leagues: cfg.leagues,
  }));
}

function channelWantsCompetition(channelId: string, competitionCode: string): boolean {
  const cfg = alertConfig[channelId];
  if (!cfg) return false;
  if (cfg.leagues.length === 0) return true; // all leagues
  return cfg.leagues.includes(competitionCode);
}

async function sendAlert(
  client: Client,
  embed: EmbedBuilder,
  competitionCode: string
): Promise<void> {
  for (const channelId of Object.keys(alertConfig)) {
    if (!channelWantsCompetition(channelId, competitionCode)) continue;
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel instanceof TextChannel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err, channelId }, "Failed to send alert to channel");
    }
  }
}

function buildGoalEmbed(
  match: Match,
  scorer: "home" | "away",
  homeScore: number,
  awayScore: number
): EmbedBuilder {
  const home = match.homeTeam.shortName || match.homeTeam.name;
  const away = match.awayTeam.shortName || match.awayTeam.name;
  const scorerTeam = scorer === "home" ? home : away;
  const min = formatMinute(match);
  const timerStr = min && min !== "FT" && min !== "HT" ? ` *(${min})*` : "";

  return new EmbedBuilder()
    .setTitle("⚽  G O A L !")
    .setColor(Colors.Yellow)
    .setDescription(
      `## ${home}  ${homeScore} – ${awayScore}  ${away}${timerStr}\n` +
        `**${scorerTeam}** find the net!`
    )
    .addFields({ name: "🏆 Competition", value: match.competition.name, inline: true })
    .setFooter({ text: "football-data.org" })
    .setTimestamp();
}

function buildHalfTimeEmbed(match: Match, homeScore: number, awayScore: number): EmbedBuilder {
  const home = match.homeTeam.shortName || match.homeTeam.name;
  const away = match.awayTeam.shortName || match.awayTeam.name;

  return new EmbedBuilder()
    .setTitle("⏸️  Half Time")
    .setColor(Colors.Orange)
    .setDescription(`## ${home}  ${homeScore} – ${awayScore}  ${away}`)
    .addFields({ name: "🏆 Competition", value: match.competition.name, inline: true })
    .setFooter({ text: "football-data.org" })
    .setTimestamp();
}

function buildFullTimeEmbed(
  competitionName: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  competitionCode: string
): EmbedBuilder {
  let resultLine: string;
  if (homeScore > awayScore) resultLine = `🏆 **${homeTeam}** win!`;
  else if (awayScore > homeScore) resultLine = `🏆 **${awayTeam}** win!`;
  else resultLine = "🤝 It's a Draw!";

  return new EmbedBuilder()
    .setTitle("🔔  Full Time")
    .setColor(Colors.Green)
    .setDescription(
      `## ${homeTeam}  ${homeScore} – ${awayScore}  ${awayTeam}\n${resultLine}`
    )
    .addFields({ name: "🏆 Competition", value: competitionName, inline: true })
    .setFooter({ text: "football-data.org" })
    .setTimestamp();
}

async function pollMatches(client: Client): Promise<void> {
  if (Object.keys(alertConfig).length === 0) return;

  let liveMatches: Match[];
  try {
    liveMatches = await getLiveMatches();
  } catch (err) {
    logger.warn({ err }, "Failed to fetch live matches for alerts");
    return;
  }

  const seenMatchIds = new Set<number>();

  for (const match of liveMatches) {
    seenMatchIds.add(match.id);
    const homeScore = match.score.fullTime.home ?? match.score.halfTime.home ?? 0;
    const awayScore = match.score.fullTime.away ?? match.score.halfTime.away ?? 0;
    const prev = matchStates.get(match.id);

    if (!prev) {
      matchStates.set(match.id, {
        homeScore,
        awayScore,
        status: match.status,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        competition: match.competition.name,
        competitionCode: match.competition.code,
      });
      continue;
    }

    const code = match.competition.code;
    const homeGoals = homeScore - prev.homeScore;
    const awayGoals = awayScore - prev.awayScore;

    // Goal alerts
    if (homeGoals > 0) {
      for (let i = 0; i < homeGoals; i++) {
        const embed = buildGoalEmbed(match, "home", prev.homeScore + i + 1, awayScore);
        await sendAlert(client, embed, code);
      }
    }
    if (awayGoals > 0) {
      for (let i = 0; i < awayGoals; i++) {
        const embed = buildGoalEmbed(match, "away", homeScore, prev.awayScore + i + 1);
        await sendAlert(client, embed, code);
      }
    }

    // Half-time alert
    if (prev.status === "IN_PLAY" && match.status === "PAUSED") {
      const embed = buildHalfTimeEmbed(match, homeScore, awayScore);
      await sendAlert(client, embed, code);
    }

    matchStates.set(match.id, { ...prev, homeScore, awayScore, status: match.status });
  }

  // Full-time: match disappeared from live feed
  for (const [matchId, state] of matchStates) {
    if (!seenMatchIds.has(matchId) && state.status !== "FINISHED") {
      const embed = buildFullTimeEmbed(
        state.competition,
        state.homeTeam,
        state.awayTeam,
        state.homeScore,
        state.awayScore,
        state.competitionCode
      );
      await sendAlert(client, embed, state.competitionCode);
      matchStates.set(matchId, { ...state, status: "FINISHED" });
    }
  }
}

export async function startAlertPolling(client: Client): Promise<void> {
  await loadAlertChannels();

  pollingTimer = setInterval(() => {
    pollMatches(client).catch((err) => {
      logger.error({ err }, "Alert polling error");
    });
  }, POLL_INTERVAL_MS);

  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Goal alert polling started");
}

export function stopAlertPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}
