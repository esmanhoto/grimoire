# Grimoire — Project Plan

A personal, local-first, open-source web app to help me run in-person D&D 5e (2024) sessions. Built for me first; open-sourced so others can benefit, but not designed as a product.

Name: **Grimoire**.

---

## 1. Goals & guiding principles

- **For me, in-person.** Not a VTT. The value is prep + fast in-session reference + organization, at a physical table.
- **Free to run.** No subscriptions, no paid APIs. Everything runs locally.
- **Local-first & offline.** Works with no internet at the table. No accounts, no cloud.
- **Clean in-game surface.** The Dashboard is used live, so it must stay minimal and configurable — I decide which panels are on the table.
- **Data I own.** Plain, portable, backup-able. No lock-in.
- **Open source.** Public repo. SRD content committed; my non-SRD/homebrew content stays local and is never committed.

---

## 2. Architecture & stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui. (Chosen to match Lovable's output for an easy design handoff.)
- **Backend:** Python + FastAPI. Serves the app, the API, the player-view route, and orchestrates the local AI pipeline.
- **Live sync:** WebSocket for **two-way** sync of combat state between the DM dashboard and the player device(s) — the player phone both reads state and writes back the fields players are allowed to edit.
- **Storage:** App-native. Campaign data stored as plain **Markdown files on disk** (one per entity: NPC, location, faction, quest, session recap), with `[[wikilinks]]` between them. Human-readable, portable, and can be git-backed by pointing the campaign folder at a private repo. No Obsidian dependency, but the files *are* an Obsidian vault if I ever want one.
- **AI (all local, $0):**
  - Transcription: `whisper.cpp` / `faster-whisper`.
  - Summarization: `qwen32b` via Ollama.
- **Trust model:** single trusted LAN table, **no auth**. Any player device can edit any player-character's visible fields; the DM can always override. (Optional "claim your character" step is a later nice-to-have, not in v1.)

---

## 3. Pages & features

Four nav pages plus one standalone screen:

1. **Dashboard** — the live, in-session screen (configurable panel board).
2. **Session Prep** — before the session.
3. **Post-Session** — after the session (AI recap).
4. **Campaign / Library** — browse/manage the wiki + content.
5. **Player View** — a standalone route opened on the phone at the table (not in the nav).

### 3.1 Dashboard (during the session) — configurable panel board
- The dashboard is a board of **panels** I choose, not a fixed layout. The combat tracker is just one panel — nothing takes over the screen, so I can look up rules/spells while combat runs.
- **Fixed preset layouts to start** (switchable), rather than free-form drag-and-drop:
  - *Exploration/roleplay*: Universal Lookup + Party + Active-Session + Quick Notes + Plotline/history.
  - *Combat*: Universal Lookup + Party + Monster/NPC sheets + Combat Tracker + Quick Notes.
- **Available panels:** Universal Lookup, Party (compact bar → expandable character sheets), NPC sheets, Monster sheets, Combat Tracker, Active-Session (this session's NPCs/locations/scenes + secrets & clues), Quick Notes, Campaign browser, Plotline/history.
- **"Start Combat"** adds the Combat Tracker panel (and can switch me to the Combat preset). Ending combat removes it. Never a full-screen takeover.

**Universal lookup panel** (the primary in-game tool)
- One fuzzy search box over SRD spells / monsters / class & race features / items / rules **plus** my campaign NPCs/locations. Instant, offline. Stays available during combat.
- **Character-scoped lookup:** a PC can act as a namespace/filter (e.g. `@Aria` scopes to her spells/features/inventory, or clicking a PC gives quick chips: Spells / Features / Inventory).

**Party panel**
- **Compact bar** always visible: name, AC, current/max HP, passive Perception/Insight, speed, key save.
- Click a PC → **full character sheet** on demand (ability scores, saves, skills, spells, features, inventory).

**Active-Session panel**
- Quick access to this session's NPCs, locations, scenes, and the secrets & clues checklist (from the prep bundle).

**Campaign browser panel**
- Browse campaign wiki entities live during play (in addition to universal search reaching them).

**Quick-capture notes panel**
- Small timestamped one-liner input; feeds the post-session recap.

### 3.2 Combat tracker (a Dashboard panel, added when in combat)
- Initiative order, whose turn, round counter; duplicate monsters auto-numbered (Goblin 1–5); legendary/lair actions.
- **Load a prepped encounter** in one click, OR **build combat ad-hoc**: search-and-add any SRD/homebrew monster, pull PCs from the party, go.

**Initiative input**
- Each combatant row has an **initiative number field**; the list **auto-sorts** by it (Dex tiebreak or manual nudge for ties). I enter monsters'; players can type their own rolled number from their phone and the order updates live.

**HP / damage input**
- Edit HP by **typing a delta** — enter `-7` and it subtracts, `+5` heals; the app does the math (no manual end-result). Temp HP handled separately.
- Colored HP bar per combatant; death saves for PCs at 0 HP.

**Concentration (non-blocking)**
- Mark a combatant as concentrating on a spell (auto-set for prepped concentration spells, one click otherwise); shows a badge.
- **On HP loss to a concentrating creature, the row highlights and shows an inline reminder/tooltip** — "⚠ Concentration save — DC X" — with the DC computed for me (`max(10, floor(damage/2))`). **No modal, nothing blocks me:** I tell the player to roll and keep doing other things. I can optionally tap **Broken** later (clears the badge and auto-removes effects that spell was sustaining); casting a new concentration spell warns the old one drops.

**Effects / conditions engine (reminds, never rolls)**
- Attach tagged effects to any combatant. An effect = label + who + duration/trigger + optional save + reminder text.
- Duration/triggers: until start/end of target's next turn, N rounds, **on next attack** (one-shot, consumed when used), **save ends** (repeats save with DC at end of turn), and **concentration** (tied to a caster; drops when concentration breaks).
- **Surfacing:** badge on the row the whole time; **when the creature's turn comes up, its reminders show prominently** (e.g. "disadvantage on next attack", "advantage on next attack"), with a click to consume/clear one-shots; save-ends effects prompt the repeat save; round/turn effects tick down and expire automatically.
- **Preset library from the start:** all SRD conditions (poisoned, prone, restrained, grappled, stunned, frightened, blinded, invisible, incapacitated, etc.) **plus** common spell/ability effects (Bless, Bane, Hex, Hunter's Mark, Faerie Fire, Guiding Bolt, Bardic Inspiration, Help, etc.), each with reminder text baked in; plus a free-form custom effect.

**DM vs. Players projection**
- The DM's tracker always shows full info (all HP/AC/effects for everyone).
- A **DM / Players toggle** previews exactly what the broadcast device shows.
- On the broadcast/player view, **enemies show status only** (Healthy / Bloodied / Down), no HP/AC numbers, but stay in the initiative order so players know when they're up; **PCs show their own AC and HP**.
- **Per-enemy show/hide** (an eye toggle on each enemy row): hidden enemies don't appear on the broadcast at all — for ambushers/lurkers I want to reveal later. One tap reveals them live. PCs are always visible.

### 3.3 Session Prep page (before the session)
- Structured around the **Sly Flourish "Lazy DM" 8 steps**: review characters, strong start, potential scenes, secrets & clues, fantastic locations, important NPCs, relevant monsters, treasure.
- Entries are real data, not just prose: monsters added here feed the combat tracker; NPCs/locations become wiki entities; secrets & clues become a live in-game list.
- Produces a **session bundle** — the app knows *this session's* NPCs, locations, scenes, planned encounters.
- "Arm" a session so the Dashboard loads it as the active session.

### 3.4 Post-Session page (after the session)
- Import session audio → local Whisper transcription.
- Transcript + quick-notes + combat log → qwen32b → structured Markdown recap (recap paragraph, NPCs, locations, quests advanced, loot, cliffhanger).
- I review/edit the AI output, then commit it into the campaign wiki. Nothing auto-writes without approval.

### 3.5 Campaign / Library page (browse & manage, any time)
- Browse and edit the accumulated wiki: NPCs, locations, factions, quests, session recaps (linked entities).
- Manage content: import/add PCs, NPCs, homebrew monsters/spells.
- Also available as a **dashboard panel** for live lookup (§3.1).

### 3.6 Player View (standalone route, on my phone at the table)
- Separate URL served by the same local server; phone opens it over Wi-Fi (QR code to connect). Own lightweight component, but subscribes to the **same combat state** and the **same "player projection" rules** as the tracker (shared logic, separate presentation).
- **Read + limited edit.** Players can edit exactly what they can see:
  - **Editable by players:** their PC's current/temp HP, AC, effects/conditions, concentration toggle, and their **initiative roll**.
  - **Not visible/editable:** enemies are hidden or status-only (healthy / bloodied / down) and locked — no monster data, no HP/AC numbers.
- Edits write back live to the shared state, so my DM tracker updates when a player marks concentration or logs damage. Gradual by design: I do it all at first, delegate whenever.
- No cloud, offline.

---

## 4. Content & data

- **SRD baseline:** SRD 5.1/5.2 is Creative Commons → committed to the public repo (with required attribution). App works out-of-the-box.
- **Non-SRD / homebrew** (full PHB spells, my custom content): loaded locally, **gitignored, never committed.** Treated identically to SRD in the app (no second-class content).
- **Character import:** paste a D&D Beyond character URL/ID → fetch its public JSON (unofficial endpoint used by community tools) → map into the schema. Caveats: unofficial (may break), sheet must be set to public, imported data stays local-only. Always keep a **simple manual form** for entry/edits and NPCs.

---

## 5. Explicitly out of scope

- Not a VTT: no battle maps, no fog of war, no grid.
- No handouts/image-push to players.
- No dice roller (real dice at the table).
- No random generators / random tables (I prep well).
- No encounter difficulty / CR calculator.
- No multi-user accounts, no login, no cloud sync (single trusted LAN table).

---

## 6. Design direction

- **Vibe:** modern, mystical, premium — evoking the 2024 D&D book aesthetic without copying copyrighted art.
- **Palette:**
  - Base: deep brown / dark leather (backgrounds).
  - Accents: emerald/mystic green + arcane purple (used in gradients).
  - Highlights: gold / brass (borders, headings, active states) — ties it to the 2024 book look.
- **Style:** glassmorphic panels over the leather base, subtle gradients, soft glows, rounded corners, ornate-but-restrained borders.
- **Art:** painterly high-fantasy placeholder art in the *style* of modern D&D (dramatic lighting, ornate frames) — generated/placeholder, never actual WotC assets.
- **Typography:** a fantasy-flavored display font for headings (readable, not gimmicky) + a clean sans for body/data.
- **Ergonomics:** the Dashboard and player view must be legible at a glance and tablet/phone-friendly; dark theme by default (table lighting).

---

## 7. Build approach

1. Generate the UI look & layout in **Lovable** (React + Tailwind + shadcn/ui) using the single prompt below (free tier = one shot).
2. Use Lovable output as the **presentation layer only** — discard any Supabase/auth/backend it adds.
3. Build the FastAPI backend + local Markdown store + AI pipeline; wire the real API into the Lovable components.

---

## 8. Lovable prompt (copy & paste the text below as one prompt)

Build a polished, high-end web app called "Grimoire" — a Dungeon Master's helper for running in-person Dungeons & Dragons 5e (2024) sessions, made for a single DM to use at the table. Use React + Tailwind + shadcn/ui. Use STATIC MOCK DATA only (no backend, no auth) — this is a visual prototype I will wire up later. Prioritise a captivating, premium, modern, mystical aesthetic that evokes the 2024 D&D book look without using any real D&D artwork.

Design system: Dark theme by default. Base colours are deep brown and dark leather for backgrounds. Accent gradients blend emerald/mystic green with arcane purple. Gold and brass are used for borders, headings, and active states. Use glassmorphism (frosted translucent panels), subtle gradients, soft glows, rounded corners, and ornate but restrained frames. Use your own painterly high-fantasy placeholder images. Headings use a fantasy-flavoured but readable display font; body text and data tables use a clean sans-serif. Everything must be legible at a glance in low light. Make it responsive: the main app is desktop-first, but the Player View must work well on a phone in portrait.

The app has a sidebar or top navigation with four pages — Dashboard, Session Prep, Post-Session, and Campaign — plus a separate standalone Player View screen that is not in the navigation. Fill every page with realistic D&D placeholder data (sample spells like Fireball, monsters like Goblin and Owlbear, a party of four characters, sample NPCs and locations) so the UI looks alive.

Dashboard is the main in-game screen. It is a configurable board of panels rather than a fixed layout, and it must stay clean and uncluttered. Provide two fixed preset layouts, switchable with a segmented control at the top: "Exploration" and "Combat". The Exploration layout shows a universal search panel, a party panel, an active-session panel, a quick-notes panel, and a plotline/history panel. The Combat layout shows the universal search panel, the party panel, monster and NPC sheet panels, the combat tracker panel, and the quick-notes panel. Panels never take over the whole screen, so search and sheets stay visible during combat. Include a "Start Combat" button that adds the combat tracker panel and switches to the Combat layout.

The universal search panel has a prominent search bar (placeholder text: "Search spells, monsters, features, items, rules, NPCs…") that shows fuzzy results grouped by type, with a way to scope the search to a specific party member so it filters to that character's spells, features, and inventory. The party panel is a horizontal row of character cards each showing name, AC, current and max HP, passive Perception, passive Insight, and speed; clicking a card opens a full character sheet with ability scores, saves, skills, spells, features, and inventory. The active-session panel has quick-access lists of this session's NPCs, Locations, and Scenes, plus a "Secrets & Clues" checklist. The quick-notes panel is a small input for adding timestamped one-line notes.

The combat tracker panel shows an ordered initiative list of combatants (both player characters and monsters). Each row has an editable initiative number field, and the list auto-sorts by initiative. Each row also shows name, AC, current and max HP with a coloured HP bar, condition and effect tags, and a highlight for the current turn. Editing HP works by typing a delta: entering "-7" subtracts 7 and "+5" heals 5, and the app does the math; temporary HP is tracked separately. There is a round counter and next and previous turn controls, and duplicate monsters are auto-numbered (Goblin 1, Goblin 2). Combat can start two ways: "Load prepped encounter" or "Build ad-hoc" with a search box to add monsters and a button to add all party members.

Concentration is non-blocking: a combatant can be flagged as concentrating on a spell, shown with a badge. When a concentrating creature loses HP, its row highlights and shows an inline reminder or tooltip reading "Concentration save — DC X" (the DC is calculated from the damage taken). There is NO modal and nothing blocks the DM; there is an optional "Broken" button to clear it, but no action is required.

Effects and conditions: any combatant can have tagged effects, each with a duration such as "until end of next turn", "N rounds", "on next attack", or "save ends". Effects show as badges, and when that creature's turn begins the tracker highlights its active reminders (for example "disadvantage on next attack" or "advantage on next attack") with a button to clear a one-shot effect. Provide a quick-apply menu with presets for the standard D&D conditions (poisoned, prone, restrained, grappled, stunned, frightened, blinded, invisible, incapacitated, and so on) and for common spells and abilities (Bless, Bane, Hex, Hunter's Mark, Faerie Fire, Guiding Bolt, Bardic Inspiration, Help), plus a custom effect option.

At the top of the combat tracker there is a DM / Players toggle. In DM view every combatant's full HP, AC, and effects are visible. In Players view — which previews what the broadcast device shows — enemies display only a status badge (Healthy, Bloodied, or Down) with no HP or AC numbers while remaining in the turn order, and player characters still show their own AC and HP. Each enemy row also has an eye icon that shows or hides that enemy on the players' view, so hidden ambushers can be revealed later with one tap; player characters are always visible.

Session Prep is a page organised as the eight steps of "Lazy DM" prep, each a titled card: Review Characters, Strong Start, Potential Scenes, Secrets & Clues, Fantastic Locations, Important NPCs, Relevant Monsters, and Treasure. Each card lets you add and edit list items, and there is an "Arm this session" button.

Post-Session is a page with an AI-assisted workflow: an area to upload or select session audio, a "Transcribe & Summarise" button, a transcript panel, and an editable structured recap with sections for Recap, NPCs, Locations, Quests, Loot, and Cliffhanger, plus a "Save to Campaign" button.

Campaign is a page with a browsable wiki of linked entities with filter tabs for NPCs, Locations, Factions, Quests, and Session Recaps, shown as a card grid with a detail view. It has "Add" buttons, an "Import character from D&D Beyond" action with a URL or ID input, and a manual character and NPC form.

Player View is a separate, standalone, phone-optimised screen for players to see and use across the table. It shows a large, high-contrast initiative order, whose turn it is with a big highlight, and the round number. Player characters are shown with their name, AC, and HP, and these fields are editable by players (current and temporary HP, AC, effects/conditions, a concentration toggle, and an initiative number input); enemies stay in the turn order but display only a "Healthy", "Bloodied", or "Down" status badge with no HP or AC numbers and cannot be edited. It is portrait-phone friendly. Show a QR code somewhere in the main app that links to it.

---

## 9. Open questions / possible additions (for later)

- Whether the campaign folder auto-commits to a private git repo for backup/history.
- "Claim your character" so each phone edits only its own PC (v1 lets any player edit any PC).
- Free-form drag-and-drop dashboard layouts (v1 uses fixed Exploration/Combat presets).
- Session timeline / in-world calendar (nice-to-have).
- Faction/relationship graph (nice-to-have).
