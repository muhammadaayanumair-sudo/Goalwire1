import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { searchTeam } from "../../services/football.js";

interface Person {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  position: string | null;
  shirtNumber: number | null;
  currentTeam: {
    id: number;
    name: string;
    shortName: string;
    crest: string;
    contract: { start: string | null; until: string | null } | null;
  } | null;
}

interface TeamSquadResponse {
  squad: Array<{
    id: number;
    name: string;
    position: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    shirtNumber: number | null;
  }>;
}

async function searchPlayerInTeam(
  teamId: number,
  playerName: string
): Promise<TeamSquadResponse["squad"][0] | null> {
  const apiKey = process.env["FOOTBALL_API_KEY"];
  if (!apiKey) throw new Error("FOOTBALL_API_KEY is not set");

  const res = await fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
    headers: { "X-Auth-Token": apiKey },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { squad: TeamSquadResponse["squad"] };
  const lower = playerName.toLowerCase();
  return (
    data.squad.find((p) => p.name.toLowerCase().includes(lower)) ?? null
  );
}

export const data = new SlashCommandBuilder()
  .setName("player")
  .setDescription("Look up a player's details")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Player name (e.g. Salah, Haaland)")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("team")
      .setDescription("Player's team (helps narrow down results)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const playerName = interaction.options.getString("name", true);
  const teamQuery = interaction.options.getString("team");

  try {
    if (!teamQuery) {
      await interaction.editReply(
        `ℹ️ For best results, also provide the **team** option (e.g. \`/player name:Salah team:Liverpool\`). Searching by name only…\n\n` +
          `⚠️ Without a team, try using the player's full or last name and specify their team.`
      );
      return;
    }

    const team = await searchTeam(teamQuery);
    if (!team) {
      await interaction.editReply(`❌ No team found matching **${teamQuery}**.`);
      return;
    }

    const player = await searchPlayerInTeam(team.id, playerName);
    if (!player) {
      await interaction.editReply(
        `❌ No player named **${playerName}** found in **${team.name}**'s squad.`
      );
      return;
    }

    const dob = player.dateOfBirth
      ? new Date(player.dateOfBirth).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "N/A";

    const age = player.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(player.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${player.name}`)
      .setColor(Colors.Purple)
      .setThumbnail(team.crest ?? null)
      .addFields(
        {
          name: "Club",
          value: team.name,
          inline: true,
        },
        {
          name: "Position",
          value: player.position ?? "N/A",
          inline: true,
        },
        {
          name: "Shirt Number",
          value: player.shirtNumber ? `#${player.shirtNumber}` : "N/A",
          inline: true,
        },
        {
          name: "Date of Birth",
          value: age ? `${dob} (age ${age})` : dob,
          inline: true,
        },
        {
          name: "Nationality",
          value: player.nationality ?? "N/A",
          inline: true,
        }
      )
      .setFooter({ text: "football-data.org" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch player info: ${(err as Error).message}`);
  }
}
