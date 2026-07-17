import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Panel } from "./Panel";
import { ContentSheet } from "./ContentDetail";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useCampaignIndex, entitySubline, type EntityType } from "@/lib/campaign";
import { useContentIndex, fuzzySearch, type ContentKind } from "@/lib/content";
import { cn } from "@/lib/utils";

// One searchable pool: SRD content (opens a detail sheet) + campaign wiki
// entities (navigate to the campaign page).
type PoolKind = ContentKind | EntityType;
type PoolEntry = { id: string; name: string; kind: PoolKind; meta: string };

const CATEGORIES: { kind: PoolKind; label: string }[] = [
  { kind: "spell", label: "Spells" },
  { kind: "monster", label: "Monsters" },
  { kind: "item", label: "Magic Items" },
  { kind: "gear", label: "Equipment" },
  { kind: "feature", label: "Features" },
  { kind: "rule", label: "Rules" },
  { kind: "pc", label: "Party" },
  { kind: "npc", label: "NPCs" },
  { kind: "location", label: "Locations" },
  { kind: "faction", label: "Factions" },
  { kind: "quest", label: "Quests" },
  { kind: "recap", label: "Recaps" },
];

const KIND_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.kind, c.label]),
);

const isSrdKind = (k: PoolKind): k is ContentKind =>
  k === "spell" || k === "monster" || k === "item" || k === "rule" || k === "feature" || k === "gear";

export function SearchPanel() {
  const [q, setQ] = useState("");
  const [activeKinds, setActiveKinds] = useState<Set<PoolKind>>(new Set());
  const [open, setOpen] = useState<{ kind: ContentKind; id: string; name: string } | null>(null);
  const srdIndex = useContentIndex();
  const campaignIndex = useCampaignIndex();
  const navigate = useNavigate();

  const pool: PoolEntry[] = useMemo(
    () => [
      ...srdIndex,
      ...campaignIndex.map(
        (e): PoolEntry => ({ id: e.id, name: e.name, kind: e.type, meta: entitySubline(e) }),
      ),
    ],
    [srdIndex, campaignIndex],
  );

  const toggleKind = (kind: PoolKind) =>
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  const results = useMemo(() => {
    const filtered = activeKinds.size === 0 ? pool : pool.filter((e) => activeKinds.has(e.kind));
    return fuzzySearch(filtered, q);
  }, [pool, q, activeKinds]);

  const grouped = useMemo(() => {
    const g: Record<string, PoolEntry[]> = {};
    for (const r of results) (g[r.kind] ??= []).push(r);
    return g;
  }, [results]);

  const pick = (r: PoolEntry) => {
    if (isSrdKind(r.kind)) setOpen({ kind: r.kind, id: r.id, name: r.name });
    else navigate({ to: "/campaign", search: { open: r.id } });
  };

  return (
    <Panel title="Grimoire Search" icon={<Search className="w-4 h-4" />} accent="purple">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search spells, monsters, items, rules, NPCs…"
          className="pl-10 pr-10 h-11 bg-black/30 border-primary/30 text-base placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map(({ kind, label }) => {
          const active = activeKinds.has(kind);
          return (
            <button
              key={kind}
              onClick={() => toggleKind(kind)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition",
                active
                  ? "bg-primary/20 border-[var(--gold)]/60 text-gold"
                  : "bg-black/20 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
            >
              {label}
            </button>
          );
        })}
        {activeKinds.size > 0 && (
          <button
            onClick={() => setActiveKinds(new Set())}
            className="text-[11px] px-2 py-1 text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            clear
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-4 max-h-80 overflow-y-auto space-y-4 pr-1">
          {Object.entries(grouped).map(([kind, items]) => (
            <div key={kind}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.25em] text-gold-soft">
                  {KIND_LABEL[kind] ?? kind}
                </span>
                <div className="rune-divider flex-1" />
                <span className="text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <ul className="space-y-1">
                {items.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => pick(r)}
                      className="w-full text-left px-3 py-2 rounded-md bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 transition cursor-pointer"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-foreground">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground">{r.meta}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {q && results.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground italic text-center">
          The grimoire is silent on "{q}".
        </p>
      )}

      <ContentSheet target={open} onClose={() => setOpen(null)} />
    </Panel>
  );
}
