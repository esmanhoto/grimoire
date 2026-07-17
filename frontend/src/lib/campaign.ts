// Campaign wiki client: Markdown entities served by the backend from the
// campaign/ folder on disk. See backend/src/grimoire/campaign.py.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marked } from "marked";

export type EntityType = "npc" | "location" | "faction" | "quest" | "recap" | "pc";

export type CampaignIndexEntry = {
  id: string;
  type: EntityType;
  name: string;
  fields: Record<string, unknown>;
  excerpt: string;
};

export type CampaignEntity = {
  id: string;
  type: EntityType;
  name: string;
  fields: Record<string, unknown>;
  body: string;
  links: { name: string; id: string | null }[];
  backlinks: { id: string; name: string; type: EntityType }[];
};

// Same shape the character sheet / combat code has always used; now sourced
// from campaign/pcs/*.md frontmatter instead of mock data.
export type Character = {
  id: string;
  name: string;
  player: string;
  class: string;
  level: number;
  race: string;
  ac: number;
  hp: number;
  maxHp: number;
  tempHp?: number;
  passivePerception: number;
  passiveInsight: number;
  speed: number;
  initiativeBonus: number;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  saves: string[];
  skills: { name: string; mod: number }[];
  spells: { name: string; level: number }[];
  features: string[];
  inventory: string[];
  color: string;
};

export const TYPE_LABEL: Record<EntityType, string> = {
  npc: "NPC",
  location: "Location",
  faction: "Faction",
  quest: "Quest",
  recap: "Session Recap",
  pc: "Player Character",
};

export function entitySubline(e: { type: EntityType; fields: Record<string, unknown> }): string {
  const f = e.fields;
  switch (e.type) {
    case "npc":
      return String(f.role ?? "NPC");
    case "location":
      return String(f.region ?? "Location");
    case "faction":
      return String(f.alignment ?? "Faction");
    case "quest":
      return String(f.status ?? "Quest");
    case "recap":
      return String(f.date ?? "Recap");
    case "pc":
      return `${f.race ?? ""} ${f.class ?? ""} ${f.level ?? ""}`.trim() || "PC";
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? r.statusText);
  return r.json() as Promise<T>;
}

export function useCampaignIndex(): CampaignIndexEntry[] {
  const { data } = useQuery({
    queryKey: ["campaign"],
    queryFn: () => api<{ entities: CampaignIndexEntry[] }>("/api/campaign"),
  });
  return data?.entities ?? [];
}

export function useCampaignEntity(id: string | null): CampaignEntity | undefined {
  const { data } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => api<CampaignEntity>(`/api/campaign/${id}`),
    enabled: id != null,
  });
  return data;
}

export function useParty(): Character[] {
  const { data } = useQuery({
    queryKey: ["party"],
    queryFn: () => api<{ party: { id: string; name: string; fields: Record<string, unknown> }[] }>("/api/party"),
  });
  return (data?.party ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    player: "",
    class: "",
    level: 1,
    race: "",
    ac: 10,
    hp: 1,
    maxHp: 1,
    passivePerception: 10,
    passiveInsight: 10,
    speed: 30,
    initiativeBonus: 0,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: [],
    skills: [],
    spells: [],
    features: [],
    inventory: [],
    color: "gold",
    ...(p.fields as Partial<Character>),
  }));
}

export function useCampaignMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["campaign"] });
    qc.invalidateQueries({ queryKey: ["party"] });
  };
  const create = useMutation({
    mutationFn: (input: { type: EntityType; name: string; fields?: Record<string, unknown>; body?: string }) =>
      api<CampaignEntity>("/api/campaign", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (input: { id: string; name?: string; fields?: Record<string, unknown>; body?: string }) =>
      api<CampaignEntity>(`/api/campaign/${input.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: input.name, fields: input.fields, body: input.body }),
      }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<{ deleted: string }>(`/api/campaign/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/** Render an entity body: markdown plus [[wikilinks]] as clickable anchors
 * (data-entity carries the target id; unresolved links get a broken style). */
export function renderWikiBody(body: string, links: { name: string; id: string | null }[]): string {
  const byName = new Map(links.map((l) => [l.name.toLowerCase(), l.id]));
  const withLinks = body.replace(
    /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g,
    (_, target: string, label?: string) => {
      const id = byName.get(target.trim().toLowerCase());
      const text = label || target.trim();
      return id
        ? `<a data-entity="${id}" class="wikilink">${text}</a>`
        : `<span class="wikilink-broken" title="No entry named '${target.trim()}' yet">${text}</span>`;
    },
  );
  return marked.parse(withLinks, { async: false }) as string;
}
