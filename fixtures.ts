import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import {
  searchTeam,
  getTeamMatches,
  formatDate,
} from "../../services/football.js";

export const data = new SlashCommandBuilder()
  .setName("fixtures")
  .setDescription("Get upcoming fixtures for a team")
  .addStringOption((option) =>
    option
      .setName("team")
      .setDescription("Team name (e.g. Liverpool, Barcelona)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const query = interaction.options.getString("team", true);

  try {
    const team = await searchTeam(query);

    if (!team) {
      await interaction.editReply(`❌ No team found matching **${query}**. Try a different spelling.`);
      return;
    }

    const upcoming = await getTeamMatches(team.id, "SCHEDULED");
    const next10 = upcoming.slice(0, 10);

    if (!next10.length) {
      await interaction.editReply(`📭 No upcoming fixtures found for **${team.name}**.`);
      return;
    }

    const rows = next10.map((m) => {
      const date = formatDate(m.utcDate);
      const time = new Date(m.utcDate).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
      const isHome = m.homeTeam.id === team.id;
      const opponent = isHome
        ? (m.awayTeam.shortName || m.awayTeam.name)
        : (m.homeTeam.shortName || m.homeTeam.name);
      const homeAway = isHome ? "🏠 vs" : "✈️ @";
      const competition = m.competition.name;
      return `**${date}** ${time} UTC — ${homeAway} **${opponent}** *(${competition})*`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`📅 Upcoming Fixtures — ${team.name}`)
      .setColor(Colors.Orange)
      .setThumbnail(team.crest ?? null)
      .setDescription(rows.join("\n"))
      .setFooter({ text: "football-data.org • All times UTC" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch fixtures: ${(err as Error).message}`);
  }
}
