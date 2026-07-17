// Static mock data for the Grimoire prototype.
// No real D&D artwork or proprietary text — flavor blurbs are original.

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
  skills: { name: string; mod: number; proficient?: boolean }[];
  spells: { name: string; level: number }[];
  features: string[];
  inventory: string[];
  color: string; // token accent
};

export type Monster = {
  id: string;
  name: string;
  cr: string;
  type: string;
  ac: number;
  hp: number;
  maxHp: number;
  speed: number;
  initiativeBonus: number;
  actions: string[];
  blurb: string;
};

export type Spell = {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration?: boolean;
  blurb: string;
};

export type NPC = { id: string; name: string; role: string; location: string; blurb: string };
export type Location = { id: string; name: string; region: string; blurb: string };
export type Scene = { id: string; title: string; blurb: string; done?: boolean };
export type Secret = { id: string; text: string; revealed?: boolean };

export const party: Character[] = [
  {
    id: "pc-1",
    name: "Ilyana Duskweaver",
    player: "Sam",
    class: "Warlock",
    level: 7,
    race: "Half-Elf",
    ac: 14,
    hp: 46,
    maxHp: 52,
    tempHp: 0,
    passivePerception: 13,
    passiveInsight: 15,
    speed: 30,
    initiativeBonus: 2,
    abilities: { str: 8, dex: 14, con: 14, int: 12, wis: 12, cha: 18 },
    saves: ["Wisdom", "Charisma"],
    skills: [
      { name: "Arcana", mod: 4, proficient: true },
      { name: "Deception", mod: 7, proficient: true },
      { name: "Persuasion", mod: 7, proficient: true },
      { name: "Insight", mod: 5, proficient: true },
    ],
    spells: [
      { name: "Eldritch Blast", level: 0 },
      { name: "Hex", level: 1 },
      { name: "Misty Step", level: 2 },
      { name: "Counterspell", level: 3 },
      { name: "Banishment", level: 4 },
    ],
    features: ["Pact of the Tome", "Agonizing Blast", "Devil's Sight"],
    inventory: ["Grimoire of the Pale Court", "Silvered Dagger", "Potion of Healing ×2", "Focus: Obsidian Idol"],
    color: "purple",
  },
  {
    id: "pc-2",
    name: "Kaervek Thornhold",
    player: "Jordan",
    class: "Paladin",
    level: 7,
    race: "Dwarf",
    ac: 20,
    hp: 68,
    maxHp: 72,
    passivePerception: 12,
    passiveInsight: 14,
    speed: 25,
    initiativeBonus: 0,
    abilities: { str: 18, dex: 10, con: 16, int: 10, wis: 12, cha: 16 },
    saves: ["Wisdom", "Charisma"],
    skills: [
      { name: "Athletics", mod: 7, proficient: true },
      { name: "Religion", mod: 3, proficient: true },
      { name: "Intimidation", mod: 6, proficient: true },
    ],
    spells: [
      { name: "Bless", level: 1 },
      { name: "Cure Wounds", level: 1 },
      { name: "Aid", level: 2 },
      { name: "Daylight", level: 3 },
    ],
    features: ["Divine Smite", "Aura of Protection", "Lay on Hands (35 HP)"],
    inventory: ["Plate Armor", "Warhammer +1", "Shield of the Dawnwatch", "Holy Symbol"],
    color: "gold",
  },
  {
    id: "pc-3",
    name: "Sable Vex",
    player: "Riley",
    class: "Rogue",
    level: 7,
    race: "Tiefling",
    ac: 16,
    hp: 42,
    maxHp: 47,
    passivePerception: 17,
    passiveInsight: 13,
    speed: 30,
    initiativeBonus: 4,
    abilities: { str: 10, dex: 18, con: 14, int: 12, wis: 12, cha: 14 },
    saves: ["Dexterity", "Intelligence"],
    skills: [
      { name: "Stealth", mod: 9, proficient: true },
      { name: "Sleight of Hand", mod: 7, proficient: true },
      { name: "Perception", mod: 7, proficient: true },
      { name: "Acrobatics", mod: 7, proficient: true },
    ],
    spells: [],
    features: ["Sneak Attack (4d6)", "Cunning Action", "Uncanny Dodge", "Assassinate"],
    inventory: ["Shortsword +1", "Hand Crossbow", "Thieves' Tools", "Poisoner's Kit"],
    color: "emerald",
  },
  {
    id: "pc-4",
    name: "Brannoc Emberfell",
    player: "Alex",
    class: "Wizard",
    level: 7,
    race: "Human",
    ac: 12,
    hp: 38,
    maxHp: 44,
    passivePerception: 11,
    passiveInsight: 14,
    speed: 30,
    initiativeBonus: 2,
    abilities: { str: 8, dex: 14, con: 14, int: 18, wis: 12, cha: 10 },
    saves: ["Intelligence", "Wisdom"],
    skills: [
      { name: "Arcana", mod: 7, proficient: true },
      { name: "History", mod: 7, proficient: true },
      { name: "Investigation", mod: 7, proficient: true },
    ],
    spells: [
      { name: "Fire Bolt", level: 0 },
      { name: "Mage Armor", level: 1 },
      { name: "Shield", level: 1 },
      { name: "Misty Step", level: 2 },
      { name: "Fireball", level: 3 },
      { name: "Counterspell", level: 3 },
      { name: "Wall of Fire", level: 4 },
    ],
    features: ["Arcane Recovery", "Evocation Savant", "Sculpt Spells"],
    inventory: ["Spellbook", "Component Pouch", "Wand of Magic Missiles", "Robe of the Ember Weave"],
    color: "ember",
  },
];

export const monsters: Monster[] = [
  {
    id: "m-goblin",
    name: "Goblin",
    cr: "1/4",
    type: "Small humanoid (goblinoid)",
    ac: 15,
    hp: 7,
    maxHp: 7,
    speed: 30,
    initiativeBonus: 2,
    actions: ["Scimitar +4 (1d6+2 slashing)", "Shortbow +4 (1d6+2 piercing)", "Nimble Escape (bonus)"],
    blurb: "Cunning scavengers of the deep wood, dangerous in numbers.",
  },
  {
    id: "m-hobgoblin",
    name: "Hobgoblin Captain",
    cr: "3",
    type: "Medium humanoid",
    ac: 17,
    hp: 39,
    maxHp: 39,
    speed: 30,
    initiativeBonus: 1,
    actions: ["Greatsword +5 (2d6+3)", "Javelin +5", "Leadership (recharge 5-6)"],
    blurb: "A disciplined tactician; rallies allies with barked commands.",
  },
  {
    id: "m-owlbear",
    name: "Owlbear",
    cr: "3",
    type: "Large monstrosity",
    ac: 13,
    hp: 59,
    maxHp: 59,
    speed: 40,
    initiativeBonus: 1,
    actions: ["Multiattack (Beak + Claws)", "Beak +7 (1d10+5)", "Claws +7 (2d8+5)"],
    blurb: "Hulking predator with the fury of a bear and the shriek of an owl.",
  },
  {
    id: "m-shadow",
    name: "Shadow",
    cr: "1/2",
    type: "Medium undead",
    ac: 12,
    hp: 16,
    maxHp: 16,
    speed: 40,
    initiativeBonus: 2,
    actions: ["Strength Drain +4 (2d6+2, reduces Str)"],
    blurb: "A whisper of malice, drinking vitality where the light fails.",
  },
  {
    id: "m-cultist",
    name: "Cultist of the Pale Court",
    cr: "1/8",
    type: "Medium humanoid",
    ac: 12,
    hp: 9,
    maxHp: 9,
    speed: 30,
    initiativeBonus: 0,
    actions: ["Scimitar +3 (1d6+1)", "Dark Devotion (adv. vs charm/fear)"],
    blurb: "Robed devotee, muttering names the world forgot.",
  },
  {
    id: "m-warlord",
    name: "Vhaelor the Hollow King",
    cr: "8",
    type: "Medium undead (boss)",
    ac: 18,
    hp: 142,
    maxHp: 142,
    speed: 30,
    initiativeBonus: 3,
    actions: ["Multiattack (2 blade)", "Sepulchral Blade +8 (2d8+4 + 2d8 necrotic)", "Chill Command (recharge 5-6)"],
    blurb: "Crowned in tarnished silver; his laughter freezes the marrow.",
  },
];

export const spells: Spell[] = [
  { id: "s-fireball", name: "Fireball", level: 3, school: "Evocation", castingTime: "1 action", range: "150 ft", components: "V, S, M", duration: "Instantaneous", blurb: "A bright streak flashes and blossoms into a roaring sphere of flame." },
  { id: "s-shield", name: "Shield", level: 1, school: "Abjuration", castingTime: "1 reaction", range: "Self", components: "V, S", duration: "1 round", blurb: "An invisible barrier of force springs to your defense." },
  { id: "s-mistystep", name: "Misty Step", level: 2, school: "Conjuration", castingTime: "1 bonus", range: "Self", components: "V", duration: "Instantaneous", blurb: "Silver mist unravels you and stitches you back into the world 30 feet away." },
  { id: "s-bless", name: "Bless", level: 1, school: "Enchantment", castingTime: "1 action", range: "30 ft", components: "V, S, M", duration: "Concentration, up to 1 min", concentration: true, blurb: "Up to three creatures add 1d4 to attack rolls and saving throws." },
  { id: "s-hex", name: "Hex", level: 1, school: "Enchantment", castingTime: "1 bonus", range: "90 ft", components: "V, S, M", duration: "Concentration, up to 1 hr", concentration: true, blurb: "You mark a creature; it takes extra 1d6 necrotic when you hit it." },
  { id: "s-counterspell", name: "Counterspell", level: 3, school: "Abjuration", castingTime: "1 reaction", range: "60 ft", components: "S", duration: "Instantaneous", blurb: "You interrupt a creature in the process of casting a spell." },
  { id: "s-cure", name: "Cure Wounds", level: 1, school: "Abjuration", castingTime: "1 action", range: "Touch", components: "V, S", duration: "Instantaneous", blurb: "A creature you touch regains 1d8 + mod HP." },
  { id: "s-eldritch", name: "Eldritch Blast", level: 0, school: "Evocation", castingTime: "1 action", range: "120 ft", components: "V, S", duration: "Instantaneous", blurb: "A beam of crackling energy streaks toward a creature." },
];

export const npcs: NPC[] = [
  { id: "n-1", name: "Mara Ashfield", role: "Innkeep, The Salted Crow", location: "Havenmoor", blurb: "Widow of a sailor. Knows every rumor on the coast, tells none for free." },
  { id: "n-2", name: "Brother Isen", role: "Cleric of the Dawnwatch", location: "Havenmoor Chapel", blurb: "Kind, gouty, and terrified of the crypt beneath his own church." },
  { id: "n-3", name: "Vex Corvo", role: "Fence & Rumor Broker", location: "The Undermarket", blurb: "One eye, three names. Sells locations of things that shouldn't exist." },
  { id: "n-4", name: "Lady Serine Vale", role: "Magistrate", location: "Havenmoor Keep", blurb: "Politely corrupt. Would rather negotiate than swing a sword." },
  { id: "n-5", name: "The Hollow King", role: "Antagonist", location: "The Pale Court", blurb: "Was once a hero. Now a hunger with a crown." },
];

export const locations: Location[] = [
  { id: "l-1", name: "Havenmoor", region: "The Sundered Coast", blurb: "A salt-stained fishing town clinging to a cliff. Half its people are hiding from someone." },
  { id: "l-2", name: "The Weeping Wood", region: "Northern Havenmoor", blurb: "A forest where the trees drip with black sap. Compasses spin. Animals stopped coming here." },
  { id: "l-3", name: "The Pale Court", region: "Beneath the Weeping Wood", blurb: "An underground palace of bleached bone and blue flame. The Hollow King's throne room." },
  { id: "l-4", name: "The Undermarket", region: "Havenmoor cellars", blurb: "A weekly black market held in a collapsed cathedral. Coin is welcome; questions are not." },
];

export const scenes: Scene[] = [
  { id: "sc-1", title: "The corpse on the beach", blurb: "A body washes up wearing the Hollow King's sigil." },
  { id: "sc-2", title: "Ambush at Blackfen Bridge", blurb: "Cultists spring from the reeds while a storm rolls in." },
  { id: "sc-3", title: "The Innkeep's confession", blurb: "Mara reveals she buried the previous adventurers." },
  { id: "sc-4", title: "The throne of bone", blurb: "The party finds Vhaelor waiting, patient and amused." },
];

export const secrets: Secret[] = [
  { id: "sec-1", text: "The Dawnwatch chapel is built over the Pale Court's antechamber." },
  { id: "sec-2", text: "Vex Corvo already sold the party's names to the cult." },
  { id: "sec-3", text: "The Hollow King is Kaervek's great-uncle, presumed dead in the last war." },
  { id: "sec-4", text: "Ilyana's patron IS the Hollow King's rival — and knows it." },
  { id: "sec-5", text: "One villager per night vanishes; no one in town remembers them." },
  { id: "sec-6", text: "Sable's contact 'The Widow' is a Shadow wearing her old face." },
];

export const conditions = [
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated",
  "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained",
  "Stunned", "Unconscious", "Exhaustion",
];

export const spellEffects = [
  "Bless", "Bane", "Hex", "Hunter's Mark", "Faerie Fire", "Guiding Bolt",
  "Bardic Inspiration", "Help", "Concentration",
];

export const factions = [
  { id: "f-1", name: "The Dawnwatch", alignment: "Order · Faith", blurb: "A militant order of clerics sworn to keep the dead in their graves." },
  { id: "f-2", name: "The Pale Court", alignment: "Chaos · Undeath", blurb: "The Hollow King and his court of bleached-bone nobility." },
  { id: "f-3", name: "The Undermarket Guild", alignment: "Neutral · Coin", blurb: "Thieves who prefer contracts to knives, but keep the knives close." },
];

export const quests = [
  { id: "q-1", name: "The Salted Crow's Ledger", status: "Active", blurb: "Recover Mara's missing account book from Vex Corvo." },
  { id: "q-2", name: "Silence the Bells", status: "Active", blurb: "Something rings the chapel bells at night. Brother Isen begs for help." },
  { id: "q-3", name: "The Hollow Crown", status: "Main Arc", blurb: "End Vhaelor before his court walks the surface at midwinter." },
  { id: "q-4", name: "A Debt Repaid", status: "Complete", blurb: "The party returned Lady Vale's stolen seal — for a price." },
];

export const sessionRecaps = [
  { id: "r-1", title: "Session 12 · The Weeping Wood Opens", date: "Sat, Oct 4", blurb: "The party found the sap-slick path and heard the Court's choir beneath the roots." },
  { id: "r-2", title: "Session 11 · Blood at the Undermarket", date: "Sat, Sep 27", blurb: "Sable killed the wrong fence. Vex is now hunting them." },
  { id: "r-3", title: "Session 10 · Brother Isen's Confession", date: "Sat, Sep 20", blurb: "The chapel's foundation is not stone. It's teeth." },
];

// Universal searchable index
export type SearchItem = { id: string; name: string; kind: string; blurb: string };
export const searchIndex: SearchItem[] = [
  ...spells.map((s) => ({ id: s.id, name: s.name, kind: "Spell", blurb: `Lvl ${s.level} · ${s.school}` })),
  ...monsters.map((m) => ({ id: m.id, name: m.name, kind: "Monster", blurb: `CR ${m.cr} · ${m.type}` })),
  ...npcs.map((n) => ({ id: n.id, name: n.name, kind: "NPC", blurb: n.role })),
  ...locations.map((l) => ({ id: l.id, name: l.name, kind: "Location", blurb: l.region })),
  ...party.map((p) => ({ id: p.id, name: p.name, kind: "Character", blurb: `${p.race} ${p.class} ${p.level}` })),
  { id: "r-adv", name: "Advantage", kind: "Rule", blurb: "Roll 2d20, take higher." },
  { id: "r-cover", name: "Cover", kind: "Rule", blurb: "Half: +2 AC/DEX. Three-quarters: +5. Total: cannot be targeted directly." },
  { id: "r-conc", name: "Concentration", kind: "Rule", blurb: "On damage, CON save DC = max(10, damage/2)." },
];
