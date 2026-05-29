import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { footballFetch, COMPETITION_NAMES } from "../../services/football.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../../data/predictions.json");

interface Prediction {
  userId: string;
  userName: string;
  matchId: number;
  home: string;
  away: string;
  predHome: number;
  predAway: number;
  date: string;
  competition: string;
  resolved?: boolean;
  actualHome?: number;
  actualAway?: number;
  points?: number;
}

interface PredictionsStore {
  [matchId: string]: { [userId: string]: Prediction };
}

async function loadPredictions(): Promise<PredictionsStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as PredictionsStore;
  } catch {
    return {};
  }
}

async function savePredictions(data: PredictionsStore) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function calcPoints(predHome: number, predAway: number, actualHome: number, actualAway: number): number {
  if (predHome === actualHome && predAway === actualAway) return 3;
  const predResult = predHome > predAway ? "H" : predHome < predAway ? "A" : "D";
  const actResult = actualHome > actualAway ? "H" : actualHome < actualAway ? "A" : "D";
  return predResult === actResult ? 1 : 0;
}

async function resolveFinished(store: PredictionsStore): Promise<PredictionsStore> {
  const unresolved = Object.entries(store).filter(([, preds]) =>
    Object.values(preds).some((p) => !p.resolved)
  );
  for (const [matchId] of unresolved) {
    try {
      const data = await footballFetch<{ match: { status: string; score: { fullTime: { home: number | null; away: number | null } } } }>(
        `/matches/${matchId}`
      );
      if (data.match?.status === "FINISHED") {
        const aH = data.match.score.fullTime.home ?? 0;
        const aA = data.match.score.fullTime.away ?? 0;
        for (const userId of Object.keys(store[matchId]!)) {
          const p = store[matchId]![userId]!;
          p.resolved = true;
          p.actualHome = aH;
          p.actualAway = aA;
          p.points = calcPoints(p.predHome, p.predAway, aH, aA);
        }
      }
    } catch { /* skip */ }
  }
  return store;
}

export const data = new SlashCommandBuilder()
  .setName("predict")
  .setDescription("Predict match scores and compete for the leaderboard")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Predict the next match for a league")
      .addStringOption((o) =>
        o.setName("league").setDescription("League code (e.g. PL, CL, BL1)").setRequired(true)
      )
      .addIntegerOption((o) =>
        o.setName("home").setDescription("Predicted home goals").setRequired(true).setMinValue(0).setMaxValue(20)
      )
      .addIntegerOption((o) =>
        o.setName("away").setDescription("Predicted away goals").setRequired(true).setMinValue(0).setMaxValue(20)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("View your active predictions")
  )
  .addSubcommand((sub) =>
    sub.setName("leaderboard").setDescription("Server prediction leaderboard")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const sub = interaction.options.getSubcommand();

  if (sub === "set") {
    const leagueInput = interaction.options.getString("league", true).toUpperCase();
    const leagueCode = COMPETITION_NAMES[leagueInput.toLowerCase()] ?? leagueInput;
    const predHome = interaction.options.getInteger("home", true);
    const predAway = interaction.options.getInteger("away", true);

    try {
      const matchData = await footballFetch<{ matches: Array<{ id: number; utcDate: string; status: string; homeTeam: { name: string }; awayTeam: { name: string }; competition: { name: string } }> }>(
        `/competitions/${leagueCode}/matches?status=SCHEDULED&limit=1`
      );
      const match = matchData.matches[0];
      if (!match) {
        await interaction.editReply(`❌ No upcoming scheduled match found for **${leagueCode}**.`);
        return;
      }

      const store = await loadPredictions();
      const key = String(match.id);
      if (!store[key]) store[key] = {};
      store[key]![interaction.user.id] = {
        userId: interaction.user.id,
        userName: interaction.user.username,
        matchId: match.id,
        home: match.homeTeam.name,
        away: match.awayTeam.name,
        predHome,
        predAway,
        date: match.utcDate,
        competition: match.competition.name,
      };
      await savePredictions(store);

      const kickoff = new Date(match.utcDate).toLocaleString("en-GB", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit", timeZone: "UTC",
      });

      const embed = new EmbedBuilder()
        .setTitle("🔮 Prediction Saved!")
        .setColor(Colors.Green)
        .addFields(
          { name: "Match", value: `**${match.homeTeam.name}** vs **${match.awayTeam.name}**`, inline: false },
          { name: "Competition", value: match.competition.name, inline: true },
          { name: "Kickoff", value: `${kickoff} UTC`, inline: true },
          { name: "Your Prediction", value: `**${predHome} – ${predAway}**`, inline: false }
        )
        .setFooter({ text: "Exact score = 3pts • Correct result = 1pt" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(`❌ Failed to set prediction: ${(err as Error).message}`);
    }
  }

  if (sub === "list") {
    const store = await resolveFinished(await loadPredictions());
    await savePredictions(store);

    const myPreds: Prediction[] = [];
    for (const matchPreds of Object.values(store)) {
      if (matchPreds[interaction.user.id]) myPreds.push(matchPreds[interaction.user.id]!);
    }

    if (myPreds.length === 0) {
      await interaction.editReply("You have no predictions yet. Use `/predict set` to make one!");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔮 Your Predictions`)
      .setColor(Colors.Blurple)
      .setTimestamp();

    for (const p of myPreds.slice(-10)) {
      const status = p.resolved
        ? `Actual: **${p.actualHome} – ${p.actualAway}** • ${p.points === 3 ? "🎯 +3pts" : p.points === 1 ? "✅ +1pt" : "❌ 0pts"}`
        : "⏳ Pending";
      embed.addFields({
        name: `${p.competition}: ${p.home} vs ${p.away}`,
        value: `Your pick: **${p.predHome} – ${p.predAway}** • ${status}`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }

  if (sub === "leaderboard") {
    const store = await resolveFinished(await loadPredictions());
    await savePredictions(store);

    const totals: Record<string, { name: string; points: number; correct: number; total: number }> = {};
    for (const matchPreds of Object.values(store)) {
      for (const p of Object.values(matchPreds)) {
        if (!p.resolved) continue;
        if (!totals[p.userId]) totals[p.userId] = { name: p.userName, points: 0, correct: 0, total: 0 };
        totals[p.userId]!.points += p.points ?? 0;
        totals[p.userId]!.correct += (p.points ?? 0) > 0 ? 1 : 0;
        totals[p.userId]!.total += 1;
      }
    }

    const sorted = Object.values(totals).sort((a, b) => b.points - a.points);
    if (sorted.length === 0) {
      await interaction.editReply("No resolved predictions yet. Check back after matches finish!");
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const rows = sorted.slice(0, 10).map((u, i) =>
      `${medals[i] ?? `**${i + 1}.**`} **${u.name}** — ${u.points}pts (${u.correct}/${u.total} correct)`
    );

    const embed = new EmbedBuilder()
      .setTitle("🏆 Prediction Leaderboard")
      .setColor(Colors.Gold)
      .setDescription(rows.join("\n"))
      .setFooter({ text: "Exact score = 3pts • Correct result = 1pt" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
