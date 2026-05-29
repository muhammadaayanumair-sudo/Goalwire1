import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import {
  searchTeam,
  getTeamMatches,
  formatMatchStatus,
  formatDate,
} from "../../services/football.js";

export const data = new SlashCommandBuilder()
  .setName("team")
  .setDescription("Look up a football team's info and recent results")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Team name (e.g. Arsenal, Real Madrid)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const query = interaction.options.getString("name", true);

  try {
    const team = await searchTeam(query);

    if (!team) {
      await interaction.editReply(`❌ No team found matching **${query}**. Try a different spelling.`);
      return;
    }

    const recentMatches = await getTeamMatches(team.id, "FINISHED");
    const last5 = recentMatches.slice(-5).reverse();

    const competitions = team.runningCompetitions
      .map((c) => c.name)
      .join(", ") || "N/A";

    const embed = new EmbedBuilder()
      .setTitle(`🏟️ ${team.name}`)
      .setColor(Colors.Blurple)
      .setThumbnail(team.crest ?? null)
      .addFields(
        { name: "Short Name", value: team.tla || team.shortName || "N/A", inline: true },
        { name: "Founded", value: team.founded ? String(team.founded) : "N/A", inline: true },
        { name: "Venue", value: team.venue || "N/A", inline: true },
        { name: "Club Colours", value: team.clubColors || "N/A", inline: true },
        { name: "Current Competitions", value: competitions, inline: false }
      )
      .setFooter({ text: "football-data.org" })
      .setTimestamp();

    if (last5.length) {
      const resultsText = last5
        .map((m) => {
          const date = formatDate(m.utcDate);
          const score = formatMatchStatus(m);
          return `${date}: ${score}`;
        })
        .join("\n");
      embed.addFields({ name: "Last 5 Results", value: resultsText, inline: false });
    }

    if (team.website) {
      embed.setURL(team.website);
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch team info: ${(err as Error).message}`);
  }
}
