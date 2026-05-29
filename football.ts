const BASE_URL = "https://api.football-data.org/v4";

export const COMPETITIONS: Record<string, string> = {
  PL: "Premier League",
  BL1: "Bundesliga",
  PD: "La Liga",
  SA: "Serie A",
  FL1: "Ligue 1",
  CL: "Champions League",
  EL: "Europa League",
  WC: "World Cup",
  EC: "European Championship",
  ELC: "Championship",
  DED: "Eredivisie",
  PPL: "Primeira Liga",
  BSA: "Brasileirão",
};

export const COMPETITION_NAMES: Record<string, string> = {
  "premier league": "PL",
  "premiership": "PL",
  "epl": "PL",
  "pl": "PL",
  "bundesliga": "BL1",
  "bl1": "BL1",
  "la liga": "PD",
  "laliga": "PD",
  "pd": "PD",
  "serie a": "SA",
  "sa": "SA",
  "ligue 1": "FL1",
  "fl1": "FL1",
  "champions league": "CL",
  "ucl": "CL",
  "cl": "CL",
  "europa league": "EL",
  "uel": "EL",
  "el": "EL",
  "world cup": "WC",
  "wc": "WC",
  "euros": "EC",
  "ec": "EC",
  "championship": "ELC",
  "elc": "ELC",
  "eredivisie": "DED",
  "ded": "DED",
  "primeira liga": "PPL",
  "ppl": "PPL",
  "brasileirao": "BSA",
  "bsa": "BSA",
};

interface MatchScore {
  winner: string | null;
  duration: string;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  minute: number | null;
  injuryTime: number | null;
  competition: { id: number; name: string; code: string };
  homeTeam: { id: number; name: string; shortName: string; tla: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string };
  score: MatchScore;
}

export interface Standing {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  website: string | null;
  founded: number | null;
  clubColors: string | null;
  venue: string | null;
  runningCompetitions: Array<{ id: number; name: string; code: string }>;
}

export async function footballFetch<T>(path: string): Promise<T> {
  const apiKey = process.env["FOOTBALL_API_KEY"];
  if (!apiKey) throw new Error("FOOTBALL_API_KEY is not set");

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Football API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getTodaysMatches(): Promise<Match[]> {
  const today = new Date().toISOString().split("T")[0];
  const data = await footballFetch<{ matches: Match[] }>(
    `/matches?dateFrom=${today}&dateTo=${today}`
  );
  return data.matches;
}

export async function getLiveMatches(): Promise<Match[]> {
  const data = await footballFetch<{ matches: Match[] }>(
    `/matches?status=IN_PLAY,PAUSED`
  );
  return data.matches;
}

export async function getMatchesByDate(date: string): Promise<Match[]> {
  const data = await footballFetch<{ matches: Match[] }>(
    `/matches?dateFrom=${date}&dateTo=${date}`
  );
  return data.matches;
}

export async function getStandings(
  competitionCode: string
): Promise<Standing[]> {
  const data = await footballFetch<{
    standings: Array<{ type: string; table: Standing[] }>;
  }>(`/competitions/${competitionCode}/standings`);

  const total = data.standings.find((s) => s.type === "TOTAL");
  return total?.table ?? data.standings[0]?.table ?? [];
}

export async function searchTeam(query: string): Promise<Team | null> {
  const data = await footballFetch<{ teams: Team[] }>(
    `/teams?search=${encodeURIComponent(query)}&limit=5`
  );
  const basic = data.teams[0];
  if (!basic) return null;
  const full = await footballFetch<Team>(`/teams/${basic.id}`);
  return full;
}

export async function getTeamMatches(
  teamId: number,
  status?: "FINISHED" | "SCHEDULED" | "IN_PLAY"
): Promise<Match[]> {
  const statusParam = status ? `&status=${status}` : "";
  const data = await footballFetch<{ matches: Match[] }>(
    `/teams/${teamId}/matches?limit=10${statusParam}`
  );
  return data.matches;
}

/** Returns a formatted timer string like "67'" or "45+2'" */
export function formatMinute(match: Match): string {
  if (match.status === "PAUSED") return "HT";
  if (match.status === "FINISHED") return "FT";
  if (match.minute === null || match.minute === undefined) return "";
  const inj = match.injuryTime && match.injuryTime > 0 ? `+${match.injuryTime}` : "";
  return `${match.minute}${inj}'`;
}

export function formatMatchStatus(match: Match): string {
  const { status, score } = match;
  const home = match.homeTeam.shortName || match.homeTeam.name;
  const away = match.awayTeam.shortName || match.awayTeam.name;
  const hg = score.fullTime.home ?? score.halfTime.home;
  const ag = score.fullTime.away ?? score.halfTime.away;
  const min = formatMinute(match);

  if (status === "FINISHED") {
    return `**${home} ${hg} – ${ag} ${away}** *(FT)*`;
  }
  if (status === "IN_PLAY") {
    const timer = min ? ` *(${min})*` : "";
    return `🔴 **${home} ${hg ?? 0} – ${ag ?? 0} ${away}**${timer}`;
  }
  if (status === "PAUSED") {
    return `⏸️ **${home} ${hg ?? 0} – ${ag ?? 0} ${away}** *(HT)*`;
  }
  if (status === "TIMED" || status === "SCHEDULED") {
    const time = new Date(match.utcDate).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
    return `🕐 ${time} UTC — ${home} vs ${away}`;
  }
  return `${home} vs ${away} *(${status})*`;
}

export function formatDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
