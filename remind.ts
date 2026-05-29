import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from "discord.js";
import {
  addReminder,
  removeReminder,
  getUserReminders,
  findNextMatchForTeam,
} from "../reminders.js";

export const data = new SlashCommandBuilder()
  .setName("remind")
  .setDescription("Set a personal DM reminder before a match kicks off")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Remind me 15 minutes before a team's next match")
      .addStringOption((opt) =>
        opt
          .setName("team")
          .setDescription("Team name (e.g. Arsenal, Real Madrid)")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("Show all your active match reminders")
  )
  .addSubcommand((sub) =>
    sub
      .setName("cancel")
      .setDescription("Cancel a reminder by match ID (shown in /remind list)")
      .addIntegerOption((opt) =>
        opt
          .setName("match_id")
          .setDescription("The match ID to cancel")
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "set") {
    await interaction.deferReply({ ephemeral: true });

    const teamQuery = interaction.options.getString("team", true);

    try {
      const match = await findNextMatchForTeam(teamQuery);

      if (!match) {
        await interaction.editReply(
          `❌ Couldn't find an upcoming match for **${teamQuery}**. Check the spelling or try \`/fixtures\`.`
        );
        return;
      }

      const kickoff = new Date(match.utcDate);
      const minsUntil = (kickoff.getTime() - Date.now()) / 60_000;

      if (minsUntil < 20) {
        await interaction.editReply(
          `⚠️ The next match for **${match.homeTeam.name} vs ${match.awayTeam.name}** kicks off in less than 20 minutes — too close to set a reminder.`
        );
        return;
      }

      const { added, existing } = await addReminder(interaction.user.id, match);

      const timeStr = kickoff.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
      const dateStr = kickoff.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });

      if (existing) {
        await interaction.editReply(
          `⚠️ You already have a reminder set for **${match.homeTeam.name} vs ${match.awayTeam.name}**.`
        );
        return;
      }

      await interaction.editReply(
        `✅ Reminder set!\n\n` +
          `I'll DM you **15 minutes before** kickoff:\n` +
          `⚽ **${match.homeTeam.name} vs ${match.awayTeam.name}**\n` +
          `📅 ${dateStr} at **${timeStr} UTC**\n` +
          `🏆 ${match.competition.name}\n\n` +
          `*Make sure your DMs are open from server members.*`
      );
    } catch (err) {
      await interaction.editReply(`❌ Something went wrong: ${(err as Error).message}`);
    }
    return;
  }

  if (sub === "list") {
    await interaction.deferReply({ ephemeral: true });

    const userReminders = getUserReminders(interaction.user.id);

    if (!userReminders.length) {
      await interaction.editReply(
        "📭 You have no active reminders. Use `/remind set team:Arsenal` to add one."
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("⏰ Your Match Reminders")
      .setColor(Colors.Blue)
      .setFooter({ text: "Use /remind cancel to remove one" })
      .setTimestamp();

    for (const r of userReminders) {
      const kickoff = new Date(r.kickoffUtc);
      const dateStr = kickoff.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
      const timeStr = kickoff.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });

      embed.addFields({
        name: `${r.homeTeam} vs ${r.awayTeam}`,
        value: `📅 ${dateStr} at ${timeStr} UTC\n🏆 ${r.competition}\n🆔 Match ID: \`${r.matchId}\``,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === "cancel") {
    await interaction.deferReply({ ephemeral: true });

    const matchId = interaction.options.getInteger("match_id", true);
    const removed = await removeReminder(interaction.user.id, matchId);

    if (removed) {
      await interaction.editReply(`🔕 Reminder for match \`${matchId}\` cancelled.`);
    } else {
      await interaction.editReply(
        `⚠️ No reminder found for match \`${matchId}\`. Use \`/remind list\` to see your active reminders.`
      );
    }
    return;
  }
}
