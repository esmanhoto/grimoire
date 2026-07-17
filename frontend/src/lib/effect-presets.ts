// Preset effects with reminder text baked in (2024 rules, abbreviated).
// The engine only reminds — it never rolls or applies math.

import type { DurationType, EffectKind } from "./combat-store";

export type EffectPreset = {
  label: string;
  kind: EffectKind;
  durationType: DurationType;
  rounds?: number;
  reminder: string;
};

export const CONDITION_PRESETS: EffectPreset[] = [
  { label: "Blinded", kind: "condition", durationType: "indefinite", reminder: "Can't see; auto-fails sight checks. Attacks vs it have Adv; its attacks have Disadv." },
  { label: "Charmed", kind: "condition", durationType: "indefinite", reminder: "Can't attack the charmer; charmer has Adv on social checks." },
  { label: "Deafened", kind: "condition", durationType: "indefinite", reminder: "Can't hear; auto-fails hearing checks." },
  { label: "Frightened", kind: "condition", durationType: "indefinite", reminder: "Disadv on checks & attacks while source in sight; can't willingly move closer." },
  { label: "Grappled", kind: "condition", durationType: "indefinite", reminder: "Speed 0; Disadv on attacks vs anyone but the grappler." },
  { label: "Incapacitated", kind: "condition", durationType: "indefinite", reminder: "No actions, bonus actions, or reactions; no concentration." },
  { label: "Invisible", kind: "condition", durationType: "indefinite", reminder: "Attacks vs it have Disadv; its attacks have Adv." },
  { label: "Paralyzed", kind: "condition", durationType: "save-ends", reminder: "Incapacitated, can't move/speak; auto-fail STR/DEX saves; attacks have Adv; melee hits crit." },
  { label: "Petrified", kind: "condition", durationType: "indefinite", reminder: "Incapacitated stone; resistance to all damage; auto-fail STR/DEX saves." },
  { label: "Poisoned", kind: "condition", durationType: "save-ends", reminder: "Disadv on attack rolls and ability checks." },
  { label: "Prone", kind: "condition", durationType: "indefinite", reminder: "Its attacks have Disadv. Melee vs it has Adv; ranged vs it has Disadv. Half speed to stand." },
  { label: "Restrained", kind: "condition", durationType: "indefinite", reminder: "Speed 0. Attacks vs it have Adv; its attacks have Disadv; Disadv on DEX saves." },
  { label: "Stunned", kind: "condition", durationType: "save-ends", reminder: "Incapacitated; auto-fail STR/DEX saves; attacks vs it have Adv." },
  { label: "Unconscious", kind: "condition", durationType: "indefinite", reminder: "Incapacitated, prone, drops everything; melee hits crit; auto-fail STR/DEX saves." },
  { label: "Exhaustion", kind: "condition", durationType: "indefinite", reminder: "−2 per level to d20 tests; speed −5 ft per level. Dies at level 6." },
];

export const SPELL_PRESETS: EffectPreset[] = [
  { label: "Bless", kind: "spell", durationType: "concentration", reminder: "+1d4 to attack rolls and saving throws." },
  { label: "Bane", kind: "spell", durationType: "concentration", reminder: "−1d4 from attack rolls and saving throws." },
  { label: "Hex", kind: "spell", durationType: "concentration", reminder: "Caster deals +1d6 necrotic on hits; Disadv on chosen ability's checks." },
  { label: "Hunter's Mark", kind: "spell", durationType: "concentration", reminder: "Marker deals +1d6 force on weapon hits." },
  { label: "Faerie Fire", kind: "spell", durationType: "concentration", reminder: "Attacks vs it have Adv; it can't benefit from Invisible." },
  { label: "Shield of Faith", kind: "spell", durationType: "concentration", reminder: "+2 AC." },
  { label: "Guiding Bolt", kind: "spell", durationType: "next-attack", reminder: "Next attack roll vs it has Advantage." },
  { label: "Bardic Inspiration", kind: "spell", durationType: "next-attack", reminder: "Add the Bardic die to one d20 test." },
  { label: "Help", kind: "spell", durationType: "next-attack", reminder: "Advantage on its next ability check." },
];

export function durationBadge(e: {
  durationType: DurationType;
  rounds: number;
  pendingSave: boolean;
}): string {
  switch (e.durationType) {
    case "rounds":
      return e.rounds === 1 ? "EoT" : `${e.rounds}r`;
    case "save-ends":
      return "save";
    case "next-attack":
      return "1×";
    case "concentration":
      return "conc";
    default:
      return "";
  }
}
