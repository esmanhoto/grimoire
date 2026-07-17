import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, MapPin, Flag, Sparkles, Plus, Link2 } from "lucide-react";
import { npcs, locations, factions, quests, sessionRecaps } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/campaign")({
  head: () => ({
    meta: [
      { title: "Campaign Wiki — Grimoire" },
      { name: "description", content: "A browsable wiki of NPCs, locations, factions, quests, and session recaps." },
      { property: "og:title", content: "Campaign Wiki — Grimoire" },
      { property: "og:description", content: "Every legend, in one place." },
    ],
  }),
  component: CampaignPage,
});

type Tab = "npcs" | "locations" | "factions" | "quests" | "recaps";
const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "npcs", label: "NPCs", icon: Users },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "factions", label: "Factions", icon: Flag },
  { key: "quests", label: "Quests", icon: Sparkles },
  { key: "recaps", label: "Session Recaps", icon: BookOpen },
];

function CampaignPage() {
  const [tab, setTab] = useState<Tab>("npcs");
  const [selected, setSelected] = useState<any | null>(null);

  const data: any[] =
    tab === "npcs" ? npcs.map((n) => ({ ...n, _sub: n.role, _tags: [n.location] }))
      : tab === "locations" ? locations.map((l) => ({ ...l, _sub: l.region, _tags: [] }))
        : tab === "factions" ? factions.map((f) => ({ ...f, _sub: f.alignment, _tags: [] }))
          : tab === "quests" ? quests.map((q) => ({ ...q, _sub: q.status, _tags: [q.status] }))
            : sessionRecaps.map((r) => ({ ...r, name: r.title, _sub: r.date, _tags: [] }));

  const IconFor = tabs.find((t) => t.key === tab)!.icon;

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-soft">
            <div className="w-8 h-px bg-gold-gradient" /> The Grimoire
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider">Campaign Wiki</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Every NPC, place, oath, and cliffhanger, cross-referenced.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <ImportBeyondDialog />
          <Button variant="outline" className="gap-2 border-primary/40"><Plus className="w-4 h-4" /> Manual Character</Button>
          <Button className="gap-2 bg-arcane text-primary-foreground shadow-arcane"><Plus className="w-4 h-4" /> Add Entry</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 ornate-frame p-1 w-fit">
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 rounded-md text-sm flex items-center gap-2 transition",
                active ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground hover:text-gold hover:bg-secondary/40",
              )}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((item: any) => (
          <button key={item.id} onClick={() => setSelected(item)} className="text-left glass-panel p-4 hover:scale-[1.01] transition group">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-arcane grid place-items-center shrink-0 shadow-arcane">
                <IconFor className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg text-gold group-hover:text-primary truncate">{item.name}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-widest">{item._sub}</div>
                <p className="text-sm mt-2 line-clamp-2 text-foreground/80">{item.blurb}</p>
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {item._tags.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-[10px] border-primary/30 text-gold-soft">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass-panel border-primary/30 max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-gold tracking-wider">{selected.name}</DialogTitle>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{selected._sub}</div>
              </DialogHeader>
              <p className="text-sm">{selected.blurb}</p>
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-widest text-gold-soft mb-1.5">Linked</div>
                <div className="flex flex-wrap gap-1.5">
                  <LinkChip label={npcs[0].name} />
                  <LinkChip label={locations[0].name} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinkChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--purple-arcane)]/15 border border-[var(--purple-arcane)]/40 text-[var(--purple-arcane)]">
      <Link2 className="w-3 h-3" /> {label}
    </span>
  );
}

function ImportBeyondDialog() {
  const [v, setV] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/40"><Link2 className="w-4 h-4" /> Import from D&D Beyond</Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-gold tracking-wider">Import Character</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Paste a D&D Beyond character URL or ID.</p>
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="https://www.dndbeyond.com/characters/…" className="bg-black/30" />
        <Button className="w-full bg-arcane text-primary-foreground shadow-arcane">Fetch & Import</Button>
      </DialogContent>
    </Dialog>
  );
}