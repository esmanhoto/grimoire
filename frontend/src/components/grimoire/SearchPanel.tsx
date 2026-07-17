import { useMemo, useState } from "react";
import { Panel } from "./Panel";
import { ContentSheet } from "./ContentDetail";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { party, npcs, locations } from "@/lib/mock-data";
import { useContentIndex, fuzzySearch, type ContentKind } from "@/lib/content";
import { cn } from "@/lib/utils";

// One searchable pool: SRD content (real ids, openable) + campaign entities
// (mock until the campaign wiki milestone) + scoped-character entries.
type PoolEntry = {
  id: string;
  name: string;
  kind: ContentKind | "character" | "npc" | "location" | "feature" | "gear";
  meta: string;
};

const KIND_LABEL: Record<string, string> = {
  spell: "Spells",
  monster: "Monsters",
  item: "Magic Items",
  rule: "Rules",
  character: "Party",
  npc: "NPCs",
  location: "Locations",
  feature: "Features",
  gear: "Inventory",
};

const isSrdKind = (k: PoolEntry["kind"]): k is ContentKind =>
  k === "spell" || k === "monster" || k === "item" || k === "rule";

export function SearchPanel({
  scopedTo,
  onClearScope,
  onSetScope,
}: {
  scopedTo?: string | null;
  onClearScope?: () => void;
  onSetScope?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ kind: ContentKind; id: string; name: string } | null>(null);
  const srdIndex = useContentIndex();
  const scopedChar = party.find((p) => p.id === scopedTo);

  const pool: PoolEntry[] = useMemo(() => {
    if (scopedChar) {
      return [
        ...scopedChar.spells.map((s): PoolEntry => {
          const srd = srdIndex.find(
            (e) => e.kind === "spell" && e.name.toLowerCase() === s.name.toLowerCase(),
          );
          return srd ?? { id: `sc-${s.name}`, name: s.name, kind: "spell", meta: `Lvl ${s.level}` };
        }),
        ...scopedChar.features.map(
          (f): PoolEntry => ({ id: `sc-f-${f}`, name: f, kind: "feature", meta: "Class feature" }),
        ),
        ...scopedChar.inventory.map(
          (i): PoolEntry => ({ id: `sc-i-${i}`, name: i, kind: "gear", meta: "Carried" }),
        ),
      ];
    }
    return [
      ...srdIndex,
      ...party.map(
        (p): PoolEntry => ({
          id: p.id,
          name: p.name,
          kind: "character",
          meta: `${p.race} ${p.class} ${p.level}`,
        }),
      ),
      ...npcs.map((n): PoolEntry => ({ id: n.id, name: n.name, kind: "npc", meta: n.role })),
      ...locations.map(
        (l): PoolEntry => ({ id: l.id, name: l.name, kind: "location", meta: l.region }),
      ),
    ];
  }, [srdIndex, scopedChar]);

  const results = useMemo(
    () => (scopedChar && !q.trim() ? pool : fuzzySearch(pool, q)),
    [pool, q, scopedChar],
  );

  const grouped = useMemo(() => {
    const g: Record<string, PoolEntry[]> = {};
    for (const r of results) (g[r.kind] ??= []).push(r);
    return g;
  }, [results]);

  const pick = (r: PoolEntry) => {
    if (isSrdKind(r.kind) && !r.id.startsWith("sc-")) {
      setOpen({ kind: r.kind, id: r.id, name: r.name });
    } else if (r.kind === "character") {
      onSetScope?.(r.id);
    }
  };

  const suggestions = q.trim() || scopedChar ? null : (
    <div className="grid grid-cols-2 gap-2 mt-3">
      <QuickChip label="Fireball" onPick={() => setQ("fireball")} kind="Spell" />
      <QuickChip label="Goblin" onPick={() => setQ("goblin")} kind="Monster" />
      <QuickChip label="Grappled" onPick={() => setQ("grappled")} kind="Rule" />
      <QuickChip label="Bag of Holding" onPick={() => setQ("bag of holding")} kind="Magic Item" />
    </div>
  );

  return (
    <Panel
      title="Grimoire Search"
      icon={<Search className="w-4 h-4" />}
      accent="purple"
      actions={
        scopedChar ? (
          <Badge variant="outline" className="border-primary/50 text-gold gap-1">
            <Filter className="w-3 h-3" />
            {scopedChar.name.split(" ")[0]}
            <button onClick={onClearScope} className="ml-1 hover:text-foreground"><X className="w-3 h-3" /></button>
          </Badge>
        ) : (
          <select
            onChange={(e) => e.target.value && onSetScope?.(e.target.value)}
            defaultValue=""
            className="bg-transparent text-xs text-muted-foreground border border-border/60 rounded px-2 py-1 hover:text-gold cursor-pointer"
          >
            <option value="" disabled>Scope to…</option>
            {party.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )
      }
    >
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={scopedChar ? `Search ${scopedChar.name.split(" ")[0]}'s spells, features, inventory…` : "Search spells, monsters, features, items, rules, NPCs…"}
          className="pl-10 pr-10 h-11 bg-black/30 border-primary/30 text-base placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {suggestions}

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
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 transition",
                        isSrdKind(r.kind) || r.kind === "character" ? "cursor-pointer" : "cursor-default",
                      )}
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

function QuickChip({ label, kind, onPick }: { label: string; kind: string; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="text-left px-3 py-2 rounded-md bg-black/20 hover:bg-black/40 border border-border/50 hover:border-primary/40 transition"
    >
      <div className="text-sm text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{kind}</div>
    </button>
  );
}
