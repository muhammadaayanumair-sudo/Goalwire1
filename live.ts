import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { getLiveMatches, formatMatchStatus } from "../../services/football.js";

export const data = new SlashCommandBuilder()
  .setName("live")
  .setDescription("Show all currently live football matches");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const matches = await getLiveMatches();

    if (!matches.length) {
      await interaction.editReply("📭 No matches are currently live.");
      return;
    }

    const grouped: Record<string, typeof matches> = {};
    for (const m of matches) {
      const key = m.competition.name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }

    const embed = new EmbedBuilder()
      .setTitle("🔴 Live Matches")
      .setColor(Colors.Red)
      .setFooter({ text: "football-data.org" })
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
    await interaction.editReply(`❌ Failed to fetch live matches: ${(err as Error).message}`);
  }
}
