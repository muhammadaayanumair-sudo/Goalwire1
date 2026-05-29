import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { searchTeam, getTeamMatches, type Match, type Team } from "../../services/football.js";

interface TeamStats {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string[]; // last 5: "W" | "D" | "L"
  cleanSheets: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
}

function getResultForTeam(match: Match, teamId: number): "W" | "D" | "L" | null {
  const { winner } = match.score;
  if (!winner) return "D";
  if (winner === "HOME_TEAM") return match.homeTeam.id === teamId ? "W" : "L";
  if (winner === "AWAY_TEAM") return match.awayTeam.id === teamId ? "W" : "L";
  return "D";
}

function getGoals(match: Match, teamId: number): { scored: number; conceded: number } {
  const hg = match.score.fullTime.home ?? 0;
  const ag = match.score.fullTime.away ?? 0;
  if (match.homeTeam.id === teamId) return { scored: hg, conceded: ag };
  return { scored: ag, conceded: hg };
}

async function buildStats(teamQuery: string): Promise<TeamStats | null> {
  const team = await searchTeam(teamQuery);
  if (!team) return null;

  const matches = await getTeamMatches(team.id, "FINISHED");
  const last10 = matches.slice(-10);
  const last5 = last10.slice(-5);

  let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0, cleanSheets = 0;

  for (const m of last10) {
    const result = getResultForTeam(m, team.id);
    const goals = getGoals(m, team.id);
    goalsFor += goals.scored;
    goalsAgainst += goals.conceded;
    if (goals.conceded === 0) cleanSheets++;
    if (result === "W") won++;
    else if (result === "D") drawn++;
    else if (result === "L") lost++;
  }

  const form = last5.map((m) => getResultForTeam(m, team.id) ?? "D");

  const played = last10.length;
  return {
    team,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    form,
    cleanSheets,
    avgGoalsFor: played > 0 ? goalsFor / played : 0,
    avgGoalsAgainst: played > 0 ? goalsAgainst / played : 0,
  };
}

function formEmoji(result: string): string {
  if (result === "W") return "🟢";
  if (result === "D") return "🟡";
  return "🔴";
}

function bar(value: number, max: number, length = 8): string {
  const filled = Math.round((value / max) * length);
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, length - filled));
}

function winnerStar(a: number, b: number): [string, string] {
  if (a > b) return ["★", " "];
  if (b > a) return [" ", "★"];
  return ["=", "="];
}

export const data = new SlashCommandBuilder()
  .setName("compare")
  .setDescription("Compare two teams side-by-side based on recent form")
  .addStringOption((opt) =>
    opt.setName("team1").setDescription("First team (e.g. Arsenal)").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("team2").setDescription("Second team (e.g. Liverpool)").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const q1 = interaction.options.getString("team1", true);
  const q2 = interaction.options.getString("team2", true);

  try {
    const [s1, s2] = await Promise.all([buildStats(q1), buildStats(q2)]);

    if (!s1) {
      await interaction.editReply(`❌ No team found for **${q1}**.`);
      return;
    }
    if (!s2) {
      await interaction.editReply(`❌ No team found for **${q2}**.`);
      return;
    }

    const n1 = s1.team.shortName || s1.team.tla || s1.team.name;
    const n2 = s2.team.shortName || s2.team.tla || s2.team.name;

    const maxGoals = Math.max(s1.goalsFor, s2.goalsFor, 1);
    const maxConceded = Math.max(s1.goalsAgainst, s2.goalsAgainst, 1);

    const [wW1, wW2] = winnerStar(s1.won, s2.won);
    const [wGF1, wGF2] = winnerStar(s1.goalsFor, s2.goalsFor);
    const [wGA1, wGA2] = winnerStar(s2.goalsAgainst, s1.goalsAgainst); // lower is better
    const [wCS1, wCS2] = winnerStar(s1.cleanSheets, s2.cleanSheets);

    // Form trend: W=3, D=1, L=0 → 0–15 pts scale
    const formScore = (form: string[]) =>
      form.reduce((acc, r) => acc + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
    const fs1 = formScore(s1.form);
    const fs2 = formScore(s2.form);
    const [wF1, wF2] = winnerStar(fs1, fs2);

    const form1 = s1.form.map(formEmoji).join(" ");
    const form2 = s2.form.map(formEmoji).join(" ");

    const label = (l: string) => `\`${l.padEnd(22)}\``;
    const val = (v: string | number) => `\`${String(v).padStart(6)}\``;

    const rows = [
      `${val(s1.won)} ${wW1} **Wins** ${wW2} ${val(s2.won)}`,
      `${val(s1.drawn)} = **Draws** = ${val(s2.drawn)}`,
      `${val(s1.lost)} ${s1.lost <= s2.lost ? "★" : " "} **Losses** ${s2.lost <= s1.lost ? "★" : " "} ${val(s2.lost)}`,
      ``,
      `\`${bar(s1.goalsFor, maxGoals)}\` ${wGF1} **Goals For** ${wGF2} \`${bar(s2.goalsFor, maxGoals)}\``,
      `${val(s1.goalsFor)} ↑ **(${s1.avgGoalsFor.toFixed(1)}/g)** ↑ ${val(s2.goalsFor)}`,
      ``,
      `\`${bar(s1.goalsAgainst, maxConceded)}\` ${wGA1} **Goals Against** ${wGA2} \`${bar(s2.goalsAgainst, maxConceded)}\``,
      `${val(s1.goalsAgainst)} ↓ **(${s1.avgGoalsAgainst.toFixed(1)}/g)** ↓ ${val(s2.goalsAgainst)}`,
      ``,
      `${val(s1.cleanSheets)} ${wCS1} **Clean Sheets** ${wCS2} ${val(s2.cleanSheets)}`,
      ``,
      `${form1} ${wF1} **Form (last 5)** ${wF2} ${form2}`,
    ].join("\n");

    // Determine overall edge
    let stars1 = [wW1, wGF1, wGA1, wCS1, wF1].filter((s) => s === "★").length;
    let stars2 = [wW2, wGF2, wGA2, wCS2, wF2].filter((s) => s === "★").length;

    let edgeLine: string;
    if (stars1 > stars2) edgeLine = `📊 **${n1}** has the edge in last ${s1.played} matches`;
    else if (stars2 > stars1) edgeLine = `📊 **${n2}** has the edge in last ${s2.played} matches`;
    else edgeLine = `📊 Evenly matched — too close to call`;

    const embed = new EmbedBuilder()
      .setTitle(`⚔️  ${n1}  vs  ${n2}`)
      .setDescription(
        `**${n1}** ${" ".repeat(28)} **${n2}**\n` +
          `*(Last ${Math.max(s1.played, s2.played)} matches)*\n\n` +
          rows +
          `\n\n${edgeLine}`
      )
      .setColor(Colors.Blurple)
      .setFooter({ text: "★ = better stat  •  football-data.org" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Compare failed: ${(err as Error).message}`);
  }
}
