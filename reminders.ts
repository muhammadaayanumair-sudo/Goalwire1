import { type Client, EmbedBuilder, Colors } from "discord.js";
import { searchTeam, getTeamMatches, type Match } from "../services/football.js";
import { logger } from "../lib/logger.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const REMINDERS_FILE = path.resolve(DATA_DIR, "reminders.json");

const REMIND_BEFORE_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 70_000; // poll window slightly wider than 60s interval

export interface Reminder {
  id: string; // `${userId}-${matchId}`
  userId: string;
  matchId: number;
  kickoffUtc: string; // ISO string
  homeTeam: string;
  awayTeam: string;
  competition: string;
  notified: boolean;
}

let reminders: Reminder[] = [];

export async function loadReminders(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(REMINDERS_FILE, "utf-8");
    reminders = JSON.parse(raw) as Reminder[];
    // Drop old notified reminders on startup
    reminders = reminders.filter((r) => !r.notified);
    logger.info({ count: reminders.length }, "Loaded pending reminders");
  } catch {
    reminders = [];
  }
}

async function saveReminders(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2), "utf-8");
}

export async function addReminder(
  userId: string,
  match: Match
): Promise<{ added: boolean; existing: boolean }> {
  const id = `${userId}-${match.id}`;
  if (reminders.find((r) => r.id === id)) return { added: false, existing: true };

  reminders.push({
    id,
    userId,
    matchId: match.id,
    kickoffUtc: match.utcDate,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    competition: match.competition.name,
    notified: false,
  });

  await saveReminders();
  return { added: true, existing: false };
}

export async function removeReminder(userId: string, matchId: number): Promise<boolean> {
  const before = reminders.length;
  reminders = reminders.filter((r) => !(r.userId === userId && r.matchId === matchId));
  if (reminders.length === before) return false;
  await saveReminders();
  return true;
}

export function getUserReminders(userId: string): Reminder[] {
  return reminders.filter((r) => r.userId === userId && !r.notified);
}

export async function findNextMatchForTeam(teamQuery: string): Promise<Match | null> {
  const team = await searchTeam(teamQuery);
  if (!team) return null;

  const matches = await getTeamMatches(team.id, "SCHEDULED");
  return matches[0] ?? null;
}

function buildReminderEmbed(reminder: Reminder): EmbedBuilder {
  const kickoff = new Date(reminder.kickoffUtc);
  const timeStr = kickoff.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const dateStr = kickoff.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return new EmbedBuilder()
    .setTitle("⏰  Kickoff in 15 minutes!")
    .setColor(Colors.Yellow)
    .setDescription(
      `## ${reminder.homeTeam} vs ${reminder.awayTeam}\n` +
        `**${dateStr}** at **${timeStr} UTC**`
    )
    .addFields({ name: "🏆 Competition", value: reminder.competition, inline: true })
    .setFooter({ text: "GoalWire reminder" })
    .setTimestamp();
}

export async function checkReminders(client: Client): Promise<void> {
  const now = Date.now();
  const pending = reminders.filter((r) => !r.notified);

  for (const reminder of pending) {
    const kickoff = new Date(reminder.kickoffUtc).getTime();
    const msUntilKickoff = kickoff - now;

    // Fire if within the 15-min window (account for poll interval)
    if (msUntilKickoff <= REMIND_BEFORE_MS && msUntilKickoff >= REMIND_BEFORE_MS - WINDOW_MS) {
      try {
        const user = await client.users.fetch(reminder.userId);
        const dm = await user.createDM();
        await dm.send({ embeds: [buildReminderEmbed(reminder)] });
        logger.info({ userId: reminder.userId, matchId: reminder.matchId }, "Sent kickoff reminder");
      } catch (err) {
        logger.warn({ err, userId: reminder.userId }, "Failed to DM reminder");
      }

      reminder.notified = true;
    }

    // Clean up past matches
    if (now > new Date(reminder.kickoffUtc).getTime() + 2 * 60 * 60 * 1000) {
      reminder.notified = true;
    }
  }

  const hadChanges = pending.some((r) => r.notified);
  if (hadChanges) {
    reminders = reminders.filter((r) => !r.notified);
    await saveReminders();
  }
}
