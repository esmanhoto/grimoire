import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Users, MapPin, Flag, Sparkles, Plus, Link2, Pencil, Trash2, CornerUpLeft, User,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  useCampaignIndex, useCampaignEntity, useCampaignMutations, renderWikiBody,
  entitySubline, TYPE_LABEL, type EntityType,
} from "@/lib/campaign";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campaign")({
  validateSearch: (s: Record<string, unknown>) => ({
    open: typeof s.open === "string" ? s.open : undefined,
  }),
  component: CampaignPage,
});

const tabs: { key: EntityType; label: string; icon: typeof Users }[] = [
  { key: "npc", label: "NPCs", icon: Users },
  { key: "location", label: "Locations", icon: MapPin },
  { key: "faction", label: "Factions", icon: Flag },
  { key: "quest", label: "Quests", icon: Sparkles },
  { key: "recap", label: "Recaps", icon: BookOpen },
  { key: "pc", label: "Party", icon: User },
];

function CampaignPage() {
  const { open } = Route.useSearch();
  const navigate = useNavigate({ from: "/campaign" });
  const entities = useCampaignIndex();
  const [tab, setTab] = useState<EntityType>("npc");
  const [openId, setOpenId] = useState<string | null>(null);

  // Deep link from universal search: /campaign?open=<id>
  useEffect(() => {
    if (open) {
      setOpenId(open);
      const type = open.split("-", 1)[0] as EntityType;
      if (type in TYPE_LABEL) setTab(type);
      navigate({ search: { open: undefined }, replace: true });
    }
  }, [open, navigate]);

  const data = entities.filter((e) => e.type === tab);
  const IconFor = tabs.find((t) => t.key === tab)!.icon;

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-soft">
            <div className="w-8 h-px bg-gold-gradient" /> The Grimoire
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider">Campaign Wiki</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Markdown files on disk, cross-referenced with [[wikilinks]] — every NPC, place, oath, and cliffhanger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <NewEntryDialog defaultType={tab} onCreated={setOpenId} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 ornate-frame p-1 w-fit">
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          const count = entities.filter((e) => e.type === t.key).length;
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
              <span className={cn("text-[10px]", active ? "opacity-80" : "text-muted-foreground/70")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((item) => (
          <button key={item.id} onClick={() => setOpenId(item.id)} className="text-left glass-panel p-4 hover:scale-[1.01] transition group">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-arcane grid place-items-center shrink-0 shadow-arcane">
                <IconFor className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg text-gold group-hover:text-primary truncate">{item.name}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-widest">{entitySubline(item)}</div>
                <p className="text-sm mt-2 line-clamp-2 text-foreground/80">{item.excerpt}</p>
              </div>
            </div>
          </button>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground italic col-span-full py-8 text-center">
            Nothing here yet — add your first {TYPE_LABEL[tab].toLowerCase()}.
          </p>
        )}
      </div>

      <EntitySheet id={openId} onClose={() => setOpenId(null)} onNavigate={setOpenId} />
    </div>
  );
}

function EntitySheet({
  id,
  onClose,
  onNavigate,
}: {
  id: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const entity = useCampaignEntity(id);
  const { update, remove } = useCampaignMutations();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftFields, setDraftFields] = useState<Record<string, string>>({});

  useEffect(() => setEditing(false), [id]);

  const startEdit = () => {
    if (!entity) return;
    setDraftName(entity.name);
    setDraftBody(entity.body);
    setDraftFields(
      Object.fromEntries(
        Object.entries(entity.fields)
          .filter(([, v]) => typeof v === "string" || typeof v === "number")
          .map(([k, v]) => [k, String(v)]),
      ),
    );
    setEditing(true);
  };

  const save = async () => {
    if (!entity) return;
    await update.mutateAsync({
      id: entity.id,
      name: draftName.trim() || entity.name,
      body: draftBody,
      fields: draftFields,
    });
    setEditing(false);
  };

  const del = async () => {
    if (!entity) return;
    if (!window.confirm(`Delete "${entity.name}"? The file is removed from disk.`)) return;
    await remove.mutateAsync(entity.id);
    onClose();
  };

  const bodyClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-entity]");
    const targetId = target?.getAttribute("data-entity");
    if (targetId) onNavigate(targetId);
  };

  const structuredFields = entity
    ? Object.entries(entity.fields).filter(([, v]) => typeof v === "object" && v !== null)
    : [];

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl glass-panel border-l-primary/30 overflow-y-auto">
        {entity && !editing && (
          <>
            <SheetHeader className="border-b border-border/60 pb-4">
              <SheetTitle className="font-display text-2xl text-gold tracking-wider">{entity.name}</SheetTitle>
              <SheetDescription className="uppercase tracking-widest text-xs">
                {TYPE_LABEL[entity.type]} · {entitySubline(entity)}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-5">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-primary/40" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--blood)]/50 text-[var(--blood)] hover:bg-[var(--blood)]/10" onClick={del}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </div>

              {Object.entries(entity.fields).filter(([, v]) => typeof v !== "object").length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(entity.fields)
                    .filter(([, v]) => typeof v !== "object")
                    .map(([k, v]) => (
                      <Badge key={k} variant="outline" className="border-primary/30 text-gold-soft text-[11px]">
                        {k}: {String(v)}
                      </Badge>
                    ))}
                </div>
              )}

              <div
                className="srd-body text-sm leading-relaxed"
                onClick={bodyClick}
                dangerouslySetInnerHTML={{ __html: renderWikiBody(entity.body, entity.links) }}
              />

              {structuredFields.length > 0 && (
                <p className="text-[11px] text-muted-foreground italic">
                  Structured stats ({structuredFields.map(([k]) => k).join(", ")}) are stored in this
                  file's frontmatter and edited from the character tools.
                </p>
              )}

              {entity.backlinks.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-gold-soft mb-1.5 flex items-center gap-1.5">
                    <CornerUpLeft className="w-3 h-3" /> Referenced by
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entity.backlinks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onNavigate(b.id)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--purple-arcane)]/15 border border-[var(--purple-arcane)]/40 text-[var(--purple-arcane)] hover:bg-[var(--purple-arcane)]/30"
                      >
                        <Link2 className="w-3 h-3" /> {b.name}
                        <span className="opacity-60">{TYPE_LABEL[b.type]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {entity && editing && (
          <>
            <SheetHeader className="border-b border-border/60 pb-4">
              <SheetTitle className="font-display text-2xl text-gold tracking-wider">Edit · {entity.name}</SheetTitle>
              <SheetDescription className="uppercase tracking-widest text-xs">
                {TYPE_LABEL[entity.type]} · saved to {entity.id.replace(/^[a-z]+-/, "")}.md
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <label className="block text-xs uppercase tracking-widest text-gold-soft">
                Name
                <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="mt-1 bg-black/30" />
              </label>
              {Object.entries(draftFields).map(([k, v]) => (
                <label key={k} className="block text-xs uppercase tracking-widest text-gold-soft">
                  {k}
                  <Input
                    value={v}
                    onChange={(e) => setDraftFields((f) => ({ ...f, [k]: e.target.value }))}
                    className="mt-1 bg-black/30"
                  />
                </label>
              ))}
              <label className="block text-xs uppercase tracking-widest text-gold-soft">
                Notes (markdown, [[wikilinks]] welcome)
                <Textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={12}
                  className="mt-1 bg-black/30 font-mono text-sm"
                />
              </label>
              <div className="flex gap-2">
                <Button onClick={save} disabled={update.isPending} className="bg-arcane text-primary-foreground shadow-arcane">
                  {update.isPending ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="border-border/60">
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NewEntryDialog({ defaultType, onCreated }: { defaultType: EntityType; onCreated: (id: string) => void }) {
  const { create } = useCampaignMutations();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EntityType>(defaultType);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setType(defaultType), [defaultType, open]);

  const submit = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      const created = await create.mutateAsync({ type, name: name.trim() });
      setOpen(false);
      setName("");
      onCreated(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-arcane text-primary-foreground shadow-arcane"><Plus className="w-4 h-4" /> Add Entry</Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-gold tracking-wider">New Entry</DialogTitle>
          <DialogDescription>Creates a Markdown file in your campaign folder.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition",
                type === t.key
                  ? "bg-primary/20 border-[var(--gold)]/60 text-gold"
                  : "bg-black/20 border-border/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {TYPE_LABEL[t.key]}
            </button>
          ))}
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={`Name the ${TYPE_LABEL[type].toLowerCase()}…`}
          className="bg-black/30"
        />
        {error && <p className="text-sm text-[var(--blood)]">{error}</p>}
        <Button onClick={submit} disabled={create.isPending || !name.trim()} className="w-full bg-arcane text-primary-foreground shadow-arcane">
          {create.isPending ? "Creating…" : "Create & Open"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
