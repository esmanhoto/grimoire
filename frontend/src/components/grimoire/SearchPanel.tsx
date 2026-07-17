import { useMemo, useState } from "react";
import { Panel } from "./Panel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { searchIndex, party, spells, monsters } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

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
  const scopedChar = party.find((p) => p.id === scopedTo);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    let pool = searchIndex;
    if (scopedChar) {
      // filter to scoped character's spells, features, inventory
      const items = [
        ...scopedChar.spells.map((s) => {
          const full = spells.find((sp) => sp.name === s.name);
          return { id: `sc-${s.name}`, name: s.name, kind: "Spell", blurb: full?.blurb ?? `Lvl ${s.level}` };
        }),
        ...scopedChar.features.map((f) => ({ id: `sc-f-${f}`, name: f, kind: "Feature", blurb: `${scopedChar.name}'s feature` })),
        ...scopedChar.inventory.map((i) => ({ id: `sc-i-${i}`, name: i, kind: "Item", blurb: `In ${scopedChar.name.split(" ")[0]}'s pack` })),
      ];
      pool = items;
    }
    return pool
      .filter((r) => r.name.toLowerCase().includes(needle) || r.blurb.toLowerCase().includes(needle))
      .slice(0, 30);
  }, [q, scopedChar]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof results> = {};
    for (const r of results) (g[r.kind] ??= []).push(r);
    return g;
  }, [results]);

  const suggestions = q.trim() ? null : (
    <div className="grid grid-cols-2 gap-2 mt-3">
      <QuickChip label="Fireball" onPick={() => setQ("fireball")} kind="Spell" />
      <QuickChip label="Owlbear" onPick={() => setQ("owlbear")} kind="Monster" />
      <QuickChip label="Concentration" onPick={() => setQ("concentration")} kind="Rule" />
      <QuickChip label="Cover" onPick={() => setQ("cover")} kind="Rule" />
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
                <span className="text-[10px] uppercase tracking-[0.25em] text-gold-soft">{kind}</span>
                <div className="rune-divider flex-1" />
                <span className="text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <ul className="space-y-1">
                {items.map((r) => (
                  <li key={r.id} className={cn("px-3 py-2 rounded-md bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 cursor-pointer transition")}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-foreground">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground">{r.blurb}</span>
                    </div>
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
