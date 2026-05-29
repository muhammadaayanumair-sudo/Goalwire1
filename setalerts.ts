import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  Colors,
} from "discord.js";
import {
  addAlertChannel,
  removeAlertChannel,
  getAlertChannels,
  setChannelLeagues,
} from "../alerts.js";
import { COMPETITIONS } from "../../services/football.js";

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
  .setName("setalerts")
  .setDescription("Configure live goal alert notifications")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Start posting goal alerts to a channel (all leagues by default)")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The channel to post alerts in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Stop sending goal alerts to a channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The channel to remove")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) => {
    const s = sub
      .setName("leagues")
      .setDescription("Filter which leagues trigger alerts in a channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The alert channel to configure")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      );
    // Up to 5 league slots (Discord limit: 25 options per command, keep it clean)
    for (let i = 1; i <= 5; i++) {
      s.addStringOption((opt) => {
        const o = opt
          .setName(`league${i}`)
          .setDescription(`League ${i} to include (leave blank to stop filtering)`)
          .setRequired(false);
        for (const choice of LEAGUE_CHOICES) o.addChoices(choice);
        return o;
      });
    }
    return s;
  })
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("Show all channels receiving goal alerts and their league filters")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "add") {
    const channel = interaction.options.getChannel("channel", true);
    const added = await addAlertChannel(channel.id);
    if (added) {
      await interaction.reply(
        `✅ Goal alerts (all leagues) will now post in <#${channel.id}>.\n` +
          `Use \`/setalerts leagues\` to filter specific leagues, or \`/setalerts remove\` to turn off.`
      );
    } else {
      await interaction.reply(`⚠️ <#${channel.id}> is already receiving goal alerts.`);
    }
    return;
  }

  if (sub === "remove") {
    const channel = interaction.options.getChannel("channel", true);
    const removed = await removeAlertChannel(channel.id);
    if (removed) {
      await interaction.reply(`🔕 Goal alerts stopped for <#${channel.id}>.`);
    } else {
      await interaction.reply(`⚠️ <#${channel.id}> wasn't in the alerts list.`);
    }
    return;
  }

  if (sub === "leagues") {
    const channel = interaction.options.getChannel("channel", true);
    const picked: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const val = interaction.options.getString(`league${i}`);
      if (val && !picked.includes(val)) picked.push(val);
    }

    const updated = await setChannelLeagues(channel.id, picked);
    if (!updated) {
      await interaction.reply(
        `❌ <#${channel.id}> isn't set up for alerts yet. Run \`/setalerts add\` first.`
      );
      return;
    }

    if (picked.length === 0) {
      await interaction.reply(
        `✅ <#${channel.id}> will now receive alerts for **all leagues**.`
      );
    } else {
      const names = picked.map((code) => COMPETITIONS[code] ?? code).join(", ");
      await interaction.reply(
        `✅ <#${channel.id}> will only receive alerts for: **${names}**`
      );
    }
    return;
  }

  if (sub === "list") {
    const channels = getAlertChannels();
    if (!channels.length) {
      await interaction.reply(
        "📭 No alert channels configured. Use `/setalerts add` to set one up."
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📣 Goal Alert Channels")
      .setColor(Colors.Blue)
      .setTimestamp();

    for (const { channelId, leagues } of channels) {
      const leagueStr =
        leagues.length === 0
          ? "All leagues"
          : leagues.map((code) => COMPETITIONS[code] ?? code).join(", ");
      embed.addFields({ name: `<#${channelId}>`, value: leagueStr, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
    return;
  }
}
