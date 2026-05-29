import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { COMPETITIONS, formatMatchStatus, formatDate, type Match } from "../../services/football.js";

const LEAGUE_CHOICES = [
  { name: "Premier League", value: "PL" },
  { name: "Bundesliga", value: "BL1" },
  { name: "La Liga", value: "PD" },
  { name: "Serie A", value: "SA" },
  { name: "Ligue 1", value: "FL1" },
  { name: "Champions League", value: "CL" },
  { name: "Europa League", value: "EL" },
  { name: "Championship", value: "ELC" },
  { name: "Eredivisie", value: "DED" },
  { name: "Primeira Liga", value: "PPL" },
];

interface CompetitionInfo {
  currentSeason: {
    currentMatchday: number | null;
  };
}

async function getCurrentMatchday(code: string): Promise<number | null> {
  const apiKey = process.env["FOOTBALL_API_KEY"];
  if (!apiKey) throw new Error("FOOTBALL_API_KEY is not set");

  const res = await fetch(`https://api.football-data.org/v4/competitions/${code}`, {
    headers: { "X-Auth-Token": apiKey },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as CompetitionInfo;
  return data.currentSeason?.currentMatchday ?? null;
}

async function getMatchdayFixtures(code: string, matchday: number): Promise<Match[]> {
  const apiKey = process.env["FOOTBALL_API_KEY"];
  if (!apiKey) throw new Error("FOOTBALL_API_KEY is not set");

  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${code}/matches?matchday=${matchday}`,
    { headers: { "X-Auth-Token": apiKey } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Football API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { matches: Match[] };
  return data.matches;
}

function matchStatusOrder(status: string): number {
  if (status === "IN_PLAY") return 0;
  if (status === "PAUSED") return 1;
  if (status === "FINISHED") return 2;
  return 3; // SCHEDULED / TIMED
}

export const data = new SlashCommandBuilder()
  .setName("matchday")
  .setDescription("Show all fixtures for a league's current matchday")
  .addStringOption((opt) => {
    const o = opt
      .setName("league")
      .setDescription("Which league")
      .setRequired(true);
    for (const c of LEAGUE_CHOICES) o.addChoices(c);
    return o;
  })
  .addIntegerOption((opt) =>
    opt
      .setName("round")
      .setDescription("Specific matchday / round number (default: current)")
      .setMinValue(1)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const leagueCode = interaction.options.getString("league", true);
  const leagueName = COMPETITIONS[leagueCode] ?? leagueCode;
  const roundOverride = interaction.options.getInteger("round");

  try {
    let matchday = roundOverride;
    if (!matchday) {
      matchday = await getCurrentMatchday(leagueCode);
      if (!matchday) {
        await interaction.editReply(
          `📭 Could not determine the current matchday for **${leagueName}**. Try specifying a round number.`
        );
        return;
      }
    }

    const matches = await getMatchdayFixtures(leagueCode, matchday);

    if (!matches.length) {
      await interaction.editReply(
        `📭 No fixtures found for **${leagueName}** matchday **${matchday}**.`
      );
      return;
    }

    // Sort: live first, then finished, then upcoming (grouped by date)
    const sorted = [...matches].sort((a, b) => {
      const statusDiff = matchStatusOrder(a.status) - matchStatusOrder(b.status);
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
    });

    // Count results
    const live = sorted.filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED").length;
    const finished = sorted.filter((m) => m.status === "FINISHED").length;
    const upcoming = sorted.filter((m) => m.status === "SCHEDULED" || m.status === "TIMED").length;

    // Group by date for display
    const byDate: Record<string, Match[]> = {};
    for (const m of sorted) {
      const day = formatDate(m.utcDate);
      if (!byDate[day]) byDate[day] = [];
      byDate[day].push(m);
    }

    const statusLine = [
      live > 0 ? `🔴 ${live} live` : "",
      finished > 0 ? `✅ ${finished} finished` : "",
      upcoming > 0 ? `🕐 ${upcoming} upcoming` : "",
    ]
      .filter(Boolean)
      .join("  •  ");

    const embed = new EmbedBuilder()
      .setTitle(`📅 ${leagueName} — Matchday ${matchday}`)
      .setColor(live > 0 ? Colors.Red : finished === matches.length ? Colors.Green : Colors.Blue)
      .setFooter({ text: `${statusLine} • football-data.org` })
      .setTimestamp();

    for (const [date, dayMatches] of Object.entries(byDate)) {
      const lines = dayMatches.map((m) => formatMatchStatus(m));
      embed.addFields({ name: `📆 ${date}`, value: lines.join("\n"), inline: false });
      if (embed.data.fields && embed.data.fields.length >= 25) break;
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(
      `❌ Failed to fetch matchday for **${leagueName}**: ${(err as Error).message}`
    );
  }
}
