import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
  PermissionFlagsBits,
} from "discord.js";
import { loadNewsConfig, saveNewsConfig } from "../newspoller.js";

export const data = new SlashCommandBuilder()
  .setName("news")
  .setDescription("Configure automatic football news posts")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand((sub) =>
    sub
      .setName("setchannel")
      .setDescription("Set this channel to receive football news updates")
  )
  .addSubcommand((sub) =>
    sub.setName("disable").setDescription("Stop posting football news in this server")
  )
  .addSubcommand((sub) =>
    sub.setName("status").setDescription("Check current news channel configuration")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const sub = interaction.options.getSubcommand();
  const config = await loadNewsConfig();

  if (sub === "setchannel") {
    config[interaction.guildId!] = {
      channelId: interaction.channelId,
      lastPosted: config[interaction.guildId!]?.lastPosted ?? null,
    };
    await saveNewsConfig(config);

    const embed = new EmbedBuilder()
      .setTitle("📰 News Channel Set!")
      .setDescription(`Football news will now be posted in <#${interaction.channelId}> every 30 minutes.`)
      .setColor(Colors.Green)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }

  if (sub === "disable") {
    delete config[interaction.guildId!];
    await saveNewsConfig(config);
    await interaction.editReply("✅ Football news disabled for this server.");
  }

  if (sub === "status") {
    const entry = config[interaction.guildId!];
    if (!entry) {
      await interaction.editReply("❌ No news channel configured. Use `/news setchannel` to set one.");
    } else {
      const last = entry.lastPosted ? new Date(entry.lastPosted).toLocaleString("en-GB") : "Never";
      await interaction.editReply(`📰 News is posting to <#${entry.channelId}>\nLast posted: **${last}**`);
    }
  }
}
