// SRD + homebrew content served by the backend. The lightweight index is
// fetched once and fuzzy-searched locally so lookup stays instant/offline;
// full entries are fetched by id on demand.

import { useQuery } from "@tanstack/react-query";

export type ContentKind = "spell" | "monster" | "item" | "rule" | "feature" | "gear";

export type IndexEntry = { id: string; name: string; kind: ContentKind; meta: string };

export type SpellEntry = {
  id: string;
  name: string;
  level: number;
  school: string;
  classes: string[];
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  body: string;
  source: string;
};

export type MonsterEntry = {
  id: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  ac: number;
  initiativeBonus: number;
  hp: number;
  hpRoll: string;
  speed: string;
  abilities: Record<string, number>;
  saves: Record<string, number>;
  cr: string;
  xp: number;
  pb: number;
  passivePerception: number;
  body: string;
  source: string;
};

export type ItemEntry = {
  id: string;
  name: string;
  itemType: string;
  rarity: string;
  body: string;
  source: string;
};

export type RuleEntry = { id: string; name: string; tag: string; body: string; source: string };

export type FeatureEntry = {
  id: string;
  name: string;
  className: string;
  level: number;
  body: string;
  source: string;
};

export type GearEntry = { id: string; name: string; category: string; body: string; source: string };

export async function fetchContentEntry<T>(kind: ContentKind, id: string): Promise<T> {
  const r = await fetch(`/api/content/${kind}/${id}`);
  if (!r.ok) throw new Error(`failed to load ${kind} ${id}`);
  return r.json() as Promise<T>;
}

export function useContentIndex(): IndexEntry[] {
  const { data } = useQuery({
    queryKey: ["content-index"],
    queryFn: async () => {
      const r = await fetch("/api/content/index");
      if (!r.ok) throw new Error("failed to load content index");
      return (await r.json()).entries as IndexEntry[];
    },
    staleTime: Infinity,
  });
  return data ?? [];
}

export function useContentEntry<T>(kind: ContentKind | null, id: string | null): T | undefined {
  const { data } = useQuery({
    queryKey: ["content", kind, id],
    queryFn: () => fetchContentEntry<T>(kind!, id!),
    enabled: kind != null && id != null,
    staleTime: Infinity,
  });
  return data;
}

// -- fuzzy search -----------------------------------------------------------

function tokenScore(text: string, token: string): number {
  const idx = text.indexOf(token);
  if (idx === 0) return 90;
  if (idx > 0) return text[idx - 1] === " " ? 80 : 60 - idx * 0.1;
  // subsequence fallback: "gbw" finds "Goblin Warrior"
  let i = 0;
  for (const ch of text) if (ch === token[i]) i++;
  return i === token.length ? 25 - (text.length - token.length) * 0.05 : -1;
}

export function fuzzySearch<T extends { name: string }>(pool: T[], query: string, limit = 30): T[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: [number, T][] = [];
  for (const entry of pool) {
    const name = entry.name.toLowerCase();
    let total = 0;
    for (const t of tokens) {
      const s = tokenScore(name, t);
      if (s < 0) {
        total = -1;
        break;
      }
      total += s;
    }
    if (total >= 0) scored.push([total + (name === tokens.join(" ") ? 50 : 0), entry]);
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, e]) => e);
}
