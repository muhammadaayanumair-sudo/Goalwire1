import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import {
  getTodaysMatches,
  getMatchesByDate,
  formatMatchStatus,
  COMPETITIONS,
} from "../../services/football.js";

export const data = new SlashCommandBuilder()
  .setName("scores")
  .setDescription("Get football match scores")
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription("Date in YYYY-MM-DD format (default: today)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const dateInput = interaction.options.getString("date");
  const today = new Date().toISOString().split("T")[0]!;
  const date = dateInput ?? today;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    await interaction.editReply("❌ Invalid date format. Use YYYY-MM-DD (e.g. `2024-05-01`).");
    return;
  }

  try {
    const matches =
      date === today ? await getTodaysMatches() : await getMatchesByDate(date);

    if (!matches.length) {
      await interaction.editReply(`📭 No matches found for **${date}**.`);
      return;
    }

    const grouped: Record<string, typeof matches> = {};
    for (const m of matches) {
      const key = m.competition.name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }

    const displayDate = new Date(date).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    const embed = new EmbedBuilder()
      .setTitle(`⚽ Scores — ${displayDate}`)
      .setColor(Colors.Green)
      .setFooter({ text: "football-data.org • All times UTC" })
      .setTimestamp();

    for (const [competition, compMatches] of Object.entries(grouped)) {
      const lines = compMatches.map((m) => formatMatchStatus(m));
      embed.addFields({
        name: `🏆 ${competition}`,
        value: lines.join("\n"),
        inline: false,
      });

      if (embed.data.fields && embed.data.fields.length >= 25) break;
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch scores: ${(err as Error).message}`);
  }
}
