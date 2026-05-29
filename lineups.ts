import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { footballFetch } from "../../services/football.js";

interface SquadMember {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: string;
  nationality: string;
}

interface TeamDetail {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  squad: SquadMember[];
}

const POSITION_ORDER = ["Goalkeeper", "Defence", "Midfield", "Offence"];
const POSITION_EMOJI: Record<string, string> = {
  Goalkeeper: "🧤",
  Defence: "🛡️",
  Midfield: "⚙️",
  Offence: "⚡",
};

export const data = new SlashCommandBuilder()
  .setName("lineups")
  .setDescription("Show a team's current squad grouped by position")
  .addStringOption((opt) =>
    opt
      .setName("team")
      .setDescription("Team name (e.g. Arsenal, Real Madrid)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const query = interaction.options.getString("team", true);

  try {
    const searchData = await footballFetch<{ teams: { id: number; name: string }[] }>(
      `/teams?search=${encodeURIComponent(query)}&limit=5`
    );
    const basic = searchData.teams[0];
    if (!basic) {
      await interaction.editReply(`❌ No team found matching **${query}**.`);
      return;
    }

    const team = await footballFetch<TeamDetail>(`/teams/${basic.id}`);

    if (!team.squad || team.squad.length === 0) {
      await interaction.editReply(`❌ No squad data available for **${team.name}**.`);
      return;
    }

    const grouped: Record<string, SquadMember[]> = {};
    for (const player of team.squad) {
      const pos = player.position ?? "Unknown";
      if (!grouped[pos]) grouped[pos] = [];
      grouped[pos].push(player);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${team.name} — Squad`)
      .setColor(Colors.Blurple)
      .setThumbnail(team.crest ?? null)
      .setFooter({ text: "football-data.org" })
      .setTimestamp();

    for (const pos of POSITION_ORDER) {
      const players = grouped[pos];
      if (!players || players.length === 0) continue;
      const emoji = POSITION_EMOJI[pos] ?? "👤";
      const list = players.map((p) => `${p.name} *(${p.nationality})*`).join("\n");
      embed.addFields({ name: `${emoji} ${pos}`, value: list, inline: false });
    }

    const others = Object.keys(grouped).filter((p) => !POSITION_ORDER.includes(p));
    for (const pos of others) {
      const players = grouped[pos]!;
      const list = players.map((p) => `${p.name} *(${p.nationality})*`).join("\n");
      embed.addFields({ name: `👤 ${pos}`, value: list, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch squad: ${(err as Error).message}`);
  }
}
