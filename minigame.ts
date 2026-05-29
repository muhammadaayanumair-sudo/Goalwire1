import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { footballFetch, COMPETITION_NAMES } from "../../services/football.js";

interface TeamBasic {
  id: number;
  name: string;
  shortName: string;
  crest: string;
}

interface Scorer {
  player: { name: string; nationality: string };
  team: { name: string };
  goals: number;
  assists: number | null;
}

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export const data = new SlashCommandBuilder()
  .setName("minigame")
  .setDescription("Football mini-games")
  .addSubcommand((sub) =>
    sub
      .setName("guess-club")
      .setDescription("Guess the club from its badge — pick the correct team")
      .addStringOption((o) =>
        o.setName("league").setDescription("League (e.g. PL, CL, BL1) — default: PL").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("guess-player")
      .setDescription("Guess the player from their stats — pick the correct name")
      .addStringOption((o) =>
        o.setName("league").setDescription("League (e.g. PL, CL, BL1) — default: PL").setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const sub = interaction.options.getSubcommand();
  const leagueInput = (interaction.options.getString("league") ?? "PL").toUpperCase();
  const leagueCode = COMPETITION_NAMES[leagueInput.toLowerCase()] ?? leagueInput;

  if (sub === "guess-club") {
    try {
      const data = await footballFetch<{ teams: TeamBasic[] }>(`/competitions/${leagueCode}/teams`);
      const teams = data.teams.filter((t) => t.crest);
      if (teams.length < 4) {
        await interaction.editReply("❌ Not enough teams in that league.");
        return;
      }

      const correct = pickRandom(teams);
      const others = shuffle(teams.filter((t) => t.id !== correct.id)).slice(0, 3);
      const options = shuffle([correct, ...others]);
      const correctIndex = options.findIndex((t) => t.id === correct.id);

      const buttons = options.map((t, i) =>
        new ButtonBuilder()
          .setCustomId(`guess_club_${i}`)
          .setLabel(t.shortName || t.name)
          .setStyle(ButtonStyle.Primary)
      );
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      const embed = new EmbedBuilder()
        .setTitle("🏟️ Guess the Club!")
        .setDescription("Which club does this badge belong to? You have **20 seconds**!")
        .setImage(correct.crest)
        .setColor(Colors.Blurple)
        .setFooter({ text: leagueCode });

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 20_000,
      });

      let answered = false;
      collector.on("collect", async (btn) => {
        if (answered) return;
        answered = true;
        collector.stop();

        const chosen = parseInt(btn.customId.split("_")[2]!);
        const isCorrect = chosen === correctIndex;

        const resultEmbed = new EmbedBuilder()
          .setTitle(isCorrect ? "✅ Correct!" : "❌ Wrong!")
          .setDescription(
            isCorrect
              ? `**${btn.user.username}** got it! It was **${correct.name}** 🎉`
              : `**${btn.user.username}** guessed wrong. It was **${correct.name}**!`
          )
          .setImage(correct.crest)
          .setColor(isCorrect ? Colors.Green : Colors.Red);

        await btn.update({ embeds: [resultEmbed], components: [] });
      });

      collector.on("end", async (_, reason) => {
        if (reason === "time" && !answered) {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⏱️ Time's up!")
            .setDescription(`No one guessed in time! It was **${correct.name}**.`)
            .setImage(correct.crest)
            .setColor(Colors.Orange);
          await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => undefined);
        }
      });
    } catch (err) {
      await interaction.editReply(`❌ Failed to start game: ${(err as Error).message}`);
    }
  }

  if (sub === "guess-player") {
    try {
      const data = await footballFetch<{ scorers: Scorer[] }>(
        `/competitions/${leagueCode}/scorers?limit=20`
      );
      const scorers = data.scorers.filter((s) => s.goals > 0);
      if (scorers.length < 4) {
        await interaction.editReply("❌ Not enough scorer data for that league.");
        return;
      }

      const correct = pickRandom(scorers);
      const others = shuffle(scorers.filter((s) => s.player.name !== correct.player.name)).slice(0, 3);
      const options = shuffle([correct, ...others]);
      const correctIndex = options.findIndex((s) => s.player.name === correct.player.name);

      const buttons = options.map((s, i) =>
        new ButtonBuilder()
          .setCustomId(`guess_player_${i}`)
          .setLabel(s.player.name.length > 80 ? s.player.name.slice(0, 77) + "..." : s.player.name)
          .setStyle(ButtonStyle.Primary)
      );
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      const embed = new EmbedBuilder()
        .setTitle("👤 Guess the Player!")
        .setDescription("Who is this player? You have **20 seconds**!")
        .setColor(Colors.Blurple)
        .addFields(
          { name: "🏟️ Club", value: correct.team.name, inline: true },
          { name: "🌍 Nationality", value: correct.player.nationality, inline: true },
          { name: "⚽ Goals", value: String(correct.goals), inline: true },
          { name: "🎯 Assists", value: String(correct.assists ?? 0), inline: true }
        )
        .setFooter({ text: leagueCode });

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 20_000,
      });

      let answered = false;
      collector.on("collect", async (btn) => {
        if (answered) return;
        answered = true;
        collector.stop();

        const chosen = parseInt(btn.customId.split("_")[2]!);
        const isCorrect = chosen === correctIndex;

        const resultEmbed = new EmbedBuilder()
          .setTitle(isCorrect ? "✅ Correct!" : "❌ Wrong!")
          .setDescription(
            isCorrect
              ? `**${btn.user.username}** got it! It was **${correct.player.name}** 🎉`
              : `**${btn.user.username}** was wrong. It was **${correct.player.name}** (${correct.goals} goals for ${correct.team.name})!`
          )
          .setColor(isCorrect ? Colors.Green : Colors.Red);

        await btn.update({ embeds: [resultEmbed], components: [] });
      });

      collector.on("end", async (_, reason) => {
        if (reason === "time" && !answered) {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⏱️ Time's up!")
            .setDescription(`It was **${correct.player.name}** (${correct.goals} goals for ${correct.team.name}).`)
            .setColor(Colors.Orange);
          await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => undefined);
        }
      });
    } catch (err) {
      await interaction.editReply(`❌ Failed to start game: ${(err as Error).message}`);
    }
  }
}
