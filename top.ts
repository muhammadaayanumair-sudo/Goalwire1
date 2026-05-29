import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { COMPETITIONS } from "../../services/football.js";

interface Scorer {
  player: {
    id: number;
    name: string;
    nationality: string | null;
    dateOfBirth: string | null;
    position: string | null;
  };
  team: { id: number; name: string; shortName: string; tla: string };
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

async function getTopScorers(competitionCode: string, limit: number): Promise<Scorer[]> {
  const apiKey = process.env["FOOTBALL_API_KEY"];
  if (!apiKey) throw new Error("FOOTBALL_API_KEY is not set");

  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${competitionCode}/scorers?limit=${limit}`,
    { headers: { "X-Auth-Token": apiKey } }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Football API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { scorers: Scorer[] };
  return data.scorers;
}

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

const MEDALS = ["🥇", "🥈", "🥉"];

export const data = new SlashCommandBuilder()
  .setName("top")
  .setDescription("Show top scorers for a league")
  .addStringOption((opt) => {
    const o = opt
      .setName("league")
      .setDescription("Which league to show")
      .setRequired(true);
    for (const choice of LEAGUE_CHOICES) o.addChoices(choice);
    return o;
  })
  .addIntegerOption((opt) =>
    opt
      .setName("limit")
      .setDescription("How many players to show (default: 10, max: 20)")
      .setMinValue(5)
      .setMaxValue(20)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const leagueCode = interaction.options.getString("league", true);
  const limit = interaction.options.getInteger("limit") ?? 10;
  const leagueName = COMPETITIONS[leagueCode] ?? leagueCode;

  try {
    const scorers = await getTopScorers(leagueCode, limit);

    if (!scorers.length) {
      await interaction.editReply(`📭 No top scorer data available for **${leagueName}** yet.`);
      return;
    }

    const rows = scorers.map((s, i) => {
      const medal = MEDALS[i] ?? `**${i + 1}.**`;
      const name = s.player.name;
      const team = s.team.shortName || s.team.tla || s.team.name;
      const goals = s.goals;
      const assists = s.assists ?? 0;
      const penalties = s.penalties ? ` (${s.penalties} pen)` : "";
      const apps = s.playedMatches;
      return `${medal} **${name}** — ${team}\n` +
             `　⚽ ${goals} goals${penalties}  🅰️ ${assists} assists  📋 ${apps} apps`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏅 Top Scorers — ${leagueName}`)
      .setColor(Colors.Gold)
      .setDescription(rows.join("\n\n"))
      .setFooter({ text: "football-data.org" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(
      `❌ Failed to fetch top scorers for **${leagueName}**: ${(err as Error).message}`
    );
  }
}
