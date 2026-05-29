import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import {
  getStandings,
  COMPETITIONS,
  COMPETITION_NAMES,
} from "../../services/football.js";

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

export const data = new SlashCommandBuilder()
  .setName("standings")
  .setDescription("Get league standings table")
  .addStringOption((option) => {
    const opt = option
      .setName("league")
      .setDescription("Which league to show")
      .setRequired(true);
    for (const choice of LEAGUE_CHOICES) {
      opt.addChoices(choice);
    }
    return opt;
  });

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const leagueCode = interaction.options.getString("league", true);
  const leagueName = COMPETITIONS[leagueCode] ?? leagueCode;

  try {
    const table = await getStandings(leagueCode);

    if (!table.length) {
      await interaction.editReply(`📭 No standings available for **${leagueName}** right now.`);
      return;
    }

    const top = table.slice(0, 20);

    const rows = top.map((row) => {
      const pos = String(row.position).padStart(2, " ");
      const team = (row.team.shortName || row.team.tla || row.team.name).padEnd(18, " ").substring(0, 18);
      const pts = String(row.points).padStart(3, " ");
      const gd = (row.goalDifference >= 0 ? "+" : "") + row.goalDifference;
      return `\`${pos}. ${team} ${pts}pts  GD:${gd}\``;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${leagueName} Standings`)
      .setColor(Colors.Blue)
      .setDescription(rows.join("\n"))
      .setFooter({ text: "football-data.org" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(
      `❌ Failed to fetch standings for **${leagueName}**: ${(err as Error).message}`
    );
  }
}
