import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { getStandings, COMPETITIONS } from "../../services/football.js";

const LEAGUE_CHOICES = [
  { name: "Premier League", value: "PL" },
  { name: "Bundesliga", value: "BL1" },
  { name: "La Liga", value: "PD" },
  { name: "Serie A", value: "SA" },
  { name: "Ligue 1", value: "FL1" },
  { name: "Championship", value: "ELC" },
  { name: "Eredivisie", value: "DED" },
  { name: "Primeira Liga", value: "PPL" },
];

const VIEW_CHOICES = [
  { name: "Title Race (Top 6)", value: "top6" },
  { name: "Top 4 (Champions League spots)", value: "top4" },
  { name: "Relegation Battle (Bottom 3)", value: "bottom3" },
  { name: "Relegation Zone (Bottom 6)", value: "bottom6" },
  { name: "Full Table (Top 20)", value: "full" },
];

const POSITION_COLORS: Record<number, string> = {};

function positionBadge(pos: number, total: number, leagueCode: string): string {
  // PL/La Liga/Serie A/Ligue 1/BL1: top 4 = CL, 5-6 = EL/ECL, bottom 3 = relegated
  const clSpots = 4;
  const elSpots = leagueCode === "ELC" ? 2 : 6; // Championship: top 2 promoted

  if (pos <= clSpots) return "🔵"; // Champions League / promotion
  if (pos <= elSpots) return "🟠"; // Europa / playoff
  if (pos > total - 3) return "🔴"; // Relegation
  return "⚪";
}

export const data = new SlashCommandBuilder()
  .setName("table")
  .setDescription("Show a focused league table snapshot")
  .addStringOption((opt) => {
    const o = opt
      .setName("league")
      .setDescription("Which league")
      .setRequired(true);
    for (const c of LEAGUE_CHOICES) o.addChoices(c);
    return o;
  })
  .addStringOption((opt) => {
    const o = opt
      .setName("view")
      .setDescription("Which part of the table (default: Title Race top 6)")
      .setRequired(false);
    for (const c of VIEW_CHOICES) o.addChoices(c);
    return o;
  });

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const leagueCode = interaction.options.getString("league", true);
  const view = interaction.options.getString("view") ?? "top6";
  const leagueName = COMPETITIONS[leagueCode] ?? leagueCode;

  try {
    const table = await getStandings(leagueCode);

    if (!table.length) {
      await interaction.editReply(`📭 No standings available for **${leagueName}** right now.`);
      return;
    }

    const total = table.length;

    let rows = table;
    let viewLabel: string;

    switch (view) {
      case "top4":
        rows = table.slice(0, 4);
        viewLabel = "Top 4 — Champions League spots";
        break;
      case "top6":
        rows = table.slice(0, 6);
        viewLabel = "Title Race — Top 6";
        break;
      case "bottom3":
        rows = table.slice(-3);
        viewLabel = "Relegation Battle — Bottom 3";
        break;
      case "bottom6":
        rows = table.slice(-6);
        viewLabel = "Danger Zone — Bottom 6";
        break;
      case "full":
      default:
        rows = table.slice(0, 20);
        viewLabel = "Full Table";
        break;
    }

    const isBottom = view === "bottom3" || view === "bottom6";

    // Build table rows
    const lines = rows.map((row) => {
      const badge = positionBadge(row.position, total, leagueCode);
      const pos = String(row.position).padStart(2);
      const team = (row.team.shortName || row.team.tla || row.team.name)
        .padEnd(16)
        .substring(0, 16);
      const pts = String(row.points).padStart(3);
      const played = String(row.playedGames).padStart(2);
      const gd = (row.goalDifference >= 0 ? "+" : "") + row.goalDifference;
      return `${badge} \`${pos}. ${team} ${pts}pts  P:${played}  GD:${gd}\``;
    });

    // Legend
    const legend =
      leagueCode === "ELC"
        ? "🔵 Auto-promotion  🟠 Playoff  🔴 Relegation"
        : "🔵 Champions Lge  🟠 Europa Lge  🔴 Relegation";

    const embedColor = isBottom ? Colors.Red : Colors.Blue;

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${leagueName} — ${viewLabel}`)
      .setColor(embedColor)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${legend} • football-data.org` })
      .setTimestamp();

    // Add gap/context rows if showing bottom section
    if ((view === "bottom3" || view === "bottom6") && rows[0]) {
      const safePos = rows[0].position;
      const aboveSafe = table[safePos - 2];
      if (aboveSafe) {
        const safeRow =
          `⚪ \`${String(aboveSafe.position).padStart(2)}. ` +
          `${(aboveSafe.team.shortName || aboveSafe.team.name).padEnd(16).substring(0, 16)} ` +
          `${String(aboveSafe.points).padStart(3)}pts  ← safety\``;
        embed.setDescription(`${safeRow}\n${lines.join("\n")}`);
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(
      `❌ Failed to fetch table for **${leagueName}**: ${(err as Error).message}`
    );
  }
}
