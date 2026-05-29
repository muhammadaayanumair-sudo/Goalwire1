import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Client, EmbedBuilder, Colors, TextChannel } from "discord.js";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, "../../data/news-config.json");
const RSS_URL = "https://feeds.bbci.co.uk/sport/football/rss.xml";

export interface NewsEntry {
  channelId: string;
  lastPosted: string | null;
}

export interface NewsConfig {
  [guildId: string]: NewsEntry;
}

export async function loadNewsConfig(): Promise<NewsConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    return JSON.parse(raw) as NewsConfig;
  } catch {
    return {};
  }
}

export async function saveNewsConfig(config: NewsConfig) {
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const body = match[1]!;
    const title = body.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const link = body.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? "";
    const description = body.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/)?.[1]?.trim() ?? "";
    const pubDate = body.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    if (title && link) items.push({ title, link, description, pubDate });
  }
  return items;
}

async function fetchLatestNews(): Promise<NewsItem[]> {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();
  return parseRSS(xml).slice(0, 5);
}

export function startNewsPolling(client: Client) {
  const poll = async () => {
    const config = await loadNewsConfig();
    if (Object.keys(config).length === 0) return;

    let items: NewsItem[];
    try {
      items = await fetchLatestNews();
    } catch (err) {
      logger.warn({ err }, "Failed to fetch football news RSS");
      return;
    }

    if (items.length === 0) return;
    const latest = items[0]!;
    const latestDate = latest.pubDate ? new Date(latest.pubDate).toISOString() : new Date().toISOString();

    let changed = false;
    for (const [guildId, entry] of Object.entries(config)) {
      if (entry.lastPosted && latestDate <= entry.lastPosted) continue;

      try {
        const channel = await client.channels.fetch(entry.channelId);
        if (!channel || !(channel instanceof TextChannel)) continue;

        for (const item of items) {
          const itemDate = item.pubDate ? new Date(item.pubDate).toISOString() : latestDate;
          if (entry.lastPosted && itemDate <= entry.lastPosted) break;

          const embed = new EmbedBuilder()
            .setTitle(item.title)
            .setURL(item.link)
            .setDescription(item.description.slice(0, 300) + (item.description.length > 300 ? "..." : ""))
            .setColor(Colors.Blue)
            .setFooter({ text: "BBC Sport Football" })
            .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

          await channel.send({ embeds: [embed] });
          await new Promise((r) => setTimeout(r, 1000));
        }

        config[guildId]!.lastPosted = latestDate;
        changed = true;
      } catch (err) {
        logger.warn({ err, guildId }, "Failed to post news to channel");
      }
    }

    if (changed) await saveNewsConfig(config);
  };

  setInterval(() => { poll().catch((err) => logger.error({ err }, "News polling error")); }, 30 * 60 * 1000);
  logger.info("Football news polling started (every 30 min)");
  poll().catch((err) => logger.error({ err }, "Initial news poll error"));
}
