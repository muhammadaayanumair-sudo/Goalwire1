import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("links")
  .setDescription("GoalWire website and social media links");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle("GoalWire Links")
    .setColor(Colors.Green)
    .addFields(
      {
        name: "🌐 Website",
        value: "[goalwire-web](https://dbec6268-46f6-442c-907c-b3ee2b5b6f97-00-3x7e7ykgjqyk.sisko.replit.dev/goalwire-web/) — Live scores, standings, top scorers & more",
        inline: false,
      },
      {
        name: "📸 Instagram",
        value: "[@aayan.editz_](https://www.instagram.com/aayan.editz_?igsh=azVxcDQyYXo0aWFj&utm_source=qr)",
        inline: false,
      }
    )
    .setFooter({ text: "GoalWire • Your football companion" });

  await interaction.reply({ embeds: [embed] });
}
