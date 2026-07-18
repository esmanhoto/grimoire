// Session prep bundles: campaign entities of type "session" whose
// frontmatter holds the Lazy-DM 8 steps. Exactly one session can be
// "armed" — the Dashboard's live panels read from it.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCampaignIndex, type CampaignEntity } from "./campaign";

export type SceneItem = { id: string; text: string; done?: boolean };
export type SecretItem = { id: string; text: string; revealed?: boolean };
export type PreppedMonster = { ref: string; name: string; count: number };
export type SessionNote = { time: string; text: string };

export type SessionData = {
  id: string;
  name: string;
  status: string;
  date: string;
  strongStart: string;
  looming: string; // "what's coming" — feeds the dashboard plotline
  reviewNotes: string;
  scenes: SceneItem[];
  secrets: SecretItem[];
  npcs: string[];
  locations: string[];
  monsters: PreppedMonster[];
  treasure: string[];
  notes: SessionNote[];
  body: string;
};

export function parseSession(e: {
  id: string;
  name: string;
  fields: Record<string, unknown>;
  body?: string;
}): SessionData {
  const f = e.fields as Partial<SessionData> & Record<string, unknown>;
  return {
    id: e.id,
    name: e.name,
    status: String(f.status ?? "draft"),
    date: String(f.date ?? ""),
    strongStart: String(f.strongStart ?? ""),
    looming: String(f.looming ?? ""),
    reviewNotes: String(f.reviewNotes ?? ""),
    scenes: (f.scenes as SceneItem[]) ?? [],
    secrets: (f.secrets as SecretItem[]) ?? [],
    npcs: (f.npcs as string[]) ?? [],
    locations: (f.locations as string[]) ?? [],
    monsters: (f.monsters as PreppedMonster[]) ?? [],
    treasure: (f.treasure as string[]) ?? [],
    notes: (f.notes as SessionNote[]) ?? [],
    body: e.body ?? "",
  };
}

export function useActiveSession(): SessionData | null {
  const { data } = useQuery({
    queryKey: ["session-active"],
    queryFn: async () => {
      const r = await fetch("/api/session/active");
      if (!r.ok) throw new Error("failed to load active session");
      return (await r.json()).session as CampaignEntity | null;
    },
  });
  return data ? parseSession(data) : null;
}

export function useSessionList() {
  return useCampaignIndex().filter((e) => e.type === "session");
}

export function useSessionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["campaign"] });
    qc.invalidateQueries({ queryKey: ["session-active"] });
  };
  const arm = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/campaign/${id}/arm`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? "failed to arm");
      return r.json();
    },
    onSuccess: invalidate,
  });
  const addNote = useMutation({
    mutationFn: async (text: string) => {
      const r = await fetch("/api/session/active/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? "failed to add note");
      return r.json();
    },
    onSuccess: invalidate,
  });
  return { arm, addNote };
}

export const newId = () => Math.random().toString(36).slice(2, 10);
