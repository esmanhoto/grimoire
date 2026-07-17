import { marked } from "marked";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  useContentEntry,
  type ContentKind,
  type FeatureEntry,
  type GearEntry,
  type ItemEntry,
  type MonsterEntry,
  type RuleEntry,
  type SpellEntry,
} from "@/lib/content";
import { cn } from "@/lib/utils";

/** Render an SRD markdown body (may contain embedded HTML tables). Content is
 * from our own committed/local files, so raw HTML is trusted. */
export function SrdBody({ body, className }: { body: string; className?: string }) {
  return (
    <div
      className={cn("srd-body text-sm leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: marked.parse(body, { async: false }) }}
    />
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-sm">
      <span className="font-semibold text-gold-soft">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

export function SpellDetail({ spell }: { spell: SpellEntry }) {
  return (
    <div className="space-y-3">
      <p className="text-sm italic text-muted-foreground">
        {spell.level === 0 ? `${spell.school} Cantrip` : `Level ${spell.level} ${spell.school}`}
        {" · "}
        {spell.classes.join(", ")}
      </p>
      <div className="space-y-1 rounded-lg bg-black/30 border border-border/40 p-3">
        <MetaRow label="Casting Time" value={spell.castingTime} />
        <MetaRow label="Range" value={spell.range} />
        <MetaRow label="Components" value={spell.components} />
        <MetaRow
          label="Duration"
          value={
            <>
              {spell.duration}
              {spell.concentration && (
                <Badge variant="outline" className="ml-2 h-5 border-[var(--purple-arcane)]/60 text-[var(--purple-arcane)]">
                  Concentration
                </Badge>
              )}
            </>
          }
        />
      </div>
      <SrdBody body={spell.body} />
    </div>
  );
}

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;

export function MonsterDetail({ monster }: { monster: MonsterEntry }) {
  const mod = (v: number) => Math.floor((v - 10) / 2);
  const fmt = (v: number) => (v >= 0 ? `+${v}` : `−${-v}`);
  return (
    <div className="space-y-3">
      <p className="text-sm italic text-muted-foreground">
        {monster.type} · {monster.alignment}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat label="AC" value={monster.ac} />
        <MiniStat label="HP" value={`${monster.hp}${monster.hpRoll ? ` (${monster.hpRoll})` : ""}`} highlight />
        <MiniStat label="Init" value={fmt(monster.initiativeBonus)} />
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-gold-soft">Speed</span> {monster.speed}
      </div>
      <div className="grid grid-cols-6 gap-1 text-center rounded-lg bg-black/30 border border-border/40 p-2">
        {ABILITIES.map((a) => (
          <div key={a}>
            <div className="text-[9px] uppercase tracking-widest text-gold-soft">{a}</div>
            <div className="font-display text-sm">{monster.abilities[a] ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {monster.abilities[a] != null ? fmt(mod(monster.abilities[a])) : ""}
              {monster.saves[a] != null && monster.saves[a] !== mod(monster.abilities[a] ?? 10)
                ? ` / ${fmt(monster.saves[a])}`
                : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>CR {monster.cr} (XP {monster.xp.toLocaleString()}; PB +{monster.pb})</span>
        <span>Passive Perception {monster.passivePerception}</span>
      </div>
      <SrdBody body={monster.body} />
    </div>
  );
}

export function ItemDetail({ item }: { item: ItemEntry }) {
  return (
    <div className="space-y-3">
      <p className="text-sm italic text-muted-foreground">
        {item.itemType} · {item.rarity}
      </p>
      <SrdBody body={item.body} />
    </div>
  );
}

export function RuleDetail({ rule }: { rule: RuleEntry }) {
  return (
    <div className="space-y-3">
      {rule.tag && <p className="text-sm italic text-muted-foreground">{rule.tag}</p>}
      <SrdBody body={rule.body} />
    </div>
  );
}

export function FeatureDetail({ feature }: { feature: FeatureEntry }) {
  return (
    <div className="space-y-3">
      {feature.className && (
        <p className="text-sm italic text-muted-foreground">
          {feature.className} feature{feature.level > 0 && ` · Level ${feature.level}`}
        </p>
      )}
      <SrdBody body={feature.body} />
    </div>
  );
}

export function GearDetail({ gear }: { gear: GearEntry }) {
  return (
    <div className="space-y-3">
      <p className="text-sm italic text-muted-foreground">{gear.category}</p>
      <SrdBody body={gear.body} />
    </div>
  );
}

export function ContentDetail({ kind, id }: { kind: ContentKind; id: string }) {
  const entry = useContentEntry<
    SpellEntry & MonsterEntry & ItemEntry & RuleEntry & FeatureEntry & GearEntry
  >(kind, id);
  if (!entry) return <p className="text-sm text-muted-foreground italic">Consulting the grimoire…</p>;
  if (kind === "spell") return <SpellDetail spell={entry} />;
  if (kind === "monster") return <MonsterDetail monster={entry} />;
  if (kind === "item") return <ItemDetail item={entry} />;
  if (kind === "feature") return <FeatureDetail feature={entry} />;
  if (kind === "gear") return <GearDetail gear={entry} />;
  return <RuleDetail rule={entry} />;
}

const KIND_LABEL: Record<ContentKind, string> = {
  spell: "Spell",
  monster: "Monster",
  item: "Magic Item",
  rule: "Rule",
  feature: "Class Feature",
  gear: "Equipment",
};

export function ContentSheet({
  target,
  onClose,
}: {
  target: { kind: ContentKind; id: string; name: string } | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg glass-panel border-l-primary/30 overflow-y-auto">
        {target && (
          <>
            <SheetHeader className="border-b border-border/60 pb-4">
              <SheetTitle className="font-display text-2xl text-gold tracking-wider">
                {target.name}
              </SheetTitle>
              <SheetDescription>{KIND_LABEL[target.kind]} · SRD 5.2.1</SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <ContentDetail kind={target.kind} id={target.id} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="ornate-frame py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("font-display text-lg", highlight ? "text-gold" : "text-foreground")}>{value}</div>
    </div>
  );
}
