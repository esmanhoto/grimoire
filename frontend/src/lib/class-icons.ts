// Map a character's class to a table-friendly icon (first match wins for
// multiclass strings like "Fighter/Wizard").

import {
  Axe, Sword, Shield, VenetianMask, Crosshair, Wand, Flame, Music, Cross,
  Leaf, Hand, Moon, Wrench, Swords, type LucideIcon,
} from "lucide-react";

const CLASS_ICONS: [string, LucideIcon][] = [
  ["barbarian", Axe],
  ["fighter", Sword],
  ["paladin", Shield],
  ["rogue", VenetianMask],
  ["ranger", Crosshair],
  ["wizard", Wand],
  ["sorcerer", Flame],
  ["bard", Music],
  ["cleric", Cross],
  ["druid", Leaf],
  ["monk", Hand],
  ["warlock", Moon],
  ["artificer", Wrench],
];

export function classIcon(className: string | undefined): LucideIcon {
  const lower = (className ?? "").toLowerCase();
  for (const [key, icon] of CLASS_ICONS) {
    if (lower.includes(key)) return icon;
  }
  return Swords;
}
