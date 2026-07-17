import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/grimoire/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic2, FileAudio, Sparkles, Save, Users, MapPin, ScrollText, Gem, Cloud, Play, Pause } from "lucide-react";

export const Route = createFileRoute("/post-session")({
  head: () => ({
    meta: [
      { title: "Post-Session — Grimoire" },
      { name: "description", content: "Transcribe session audio and turn it into a structured recap." },
      { property: "og:title", content: "Post-Session — Grimoire" },
      { property: "og:description", content: "Turn table talk into canon." },
    ],
  }),
  component: PostSession,
});

const sampleTranscript = `[00:02:14] Sam (as Ilyana): "The sap on this tree... it's warm."
[00:02:31] DM: A low humming rises from the roots — a choir of dozens.
[00:03:05] Jordan (as Kaervek): "By the Dawnwatch. Weapons out. Now."
[00:04:12] Riley (as Sable): Rolling stealth — natural 19, plus nine.
[00:11:32] DM: A goblin scout rounds the corner and freezes. Roll initiative.
[00:22:04] Sam: I use Banishment on the Hobgoblin Captain. DC 16.
[00:31:15] Riley: Sable lifts the sigil ring off Vex Corvo.
[00:38:00] DM: Vhaelor is waiting. He waves you toward empty chairs.`;

const recap = {
  Recap: "The party crossed the last mile of the Weeping Wood, silenced a cultist choir, and descended the Old Netherese stair. They now stand on the threshold of Vhaelor's throne room — and he is expecting them.",
  NPCs: ["Vex Corvo — lost his sigil ring, doesn't know yet.", "The Hollow King (Vhaelor) — cordial, patient, terrifying."],
  Locations: ["The Weeping Wood — sap-warm, humming with voices.", "The Netherese Stair — carved with warnings.", "The Pale Court — hall of bone."],
  Quests: ["Silence the Bells — advanced.", "The Hollow Crown — imminent."],
  Loot: ["Vex's sigil ring (uses unknown).", "Silvered greatsword."],
  Cliffhanger: "Vhaelor gestures at six chairs. In the sixth sits a figure with Kaervek's face.",
};

function PostSession() {
  const [phase, setPhase] = useState<"idle" | "transcribing" | "done">("idle");
  const [playing, setPlaying] = useState(false);
  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-soft">
          <div className="w-8 h-px bg-gold-gradient" /> After the table clears
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider">Post-Session</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Let the AI listen so you can remember.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Session Audio" icon={<FileAudio className="w-4 h-4" />} accent="purple">
          <div className="ornate-frame p-6 text-center bg-black/20">
            <div className="w-14 h-14 rounded-full bg-arcane grid place-items-center mx-auto shadow-arcane">
              <Cloud className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="mt-3 font-display text-lg text-gold">session-13.m4a</div>
            <div className="text-xs text-muted-foreground">42 min · recorded Sat 10:14 PM</div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)} className="gap-1.5">
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button size="sm" variant="ghost">Choose another…</Button>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-black/50 overflow-hidden">
              <div className="h-full bg-arcane transition-all" style={{ width: playing ? "38%" : "0%" }} />
            </div>
          </div>
          <Button
            onClick={() => { setPhase("transcribing"); setTimeout(() => setPhase("done"), 1400); }}
            disabled={phase === "transcribing"}
            className="w-full mt-4 bg-arcane text-primary-foreground shadow-arcane gap-2 font-semibold tracking-wide h-11"
          >
            <Sparkles className="w-4 h-4" />
            {phase === "idle" && "Transcribe & Summarise"}
            {phase === "transcribing" && "Listening to the tape…"}
            {phase === "done" && "Re-run"}
          </Button>
        </Panel>
        <Panel title="Transcript" icon={<Mic2 className="w-4 h-4" />}>
          {phase === "idle" ? (
            <div className="text-sm text-muted-foreground italic py-12 text-center">
              The transcript will appear here after the AI listens.
            </div>
          ) : phase === "transcribing" ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="w-10 h-3 rounded bg-secondary/60" />
                  <div className="flex-1 h-3 rounded bg-secondary/40" />
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto text-muted-foreground font-mono">{sampleTranscript}</pre>
          )}
        </Panel>
      </div>
      <Panel
        title="Structured Recap"
        icon={<ScrollText className="w-4 h-4" />}
        accent="emerald"
        actions={<Button size="sm" className="bg-gold-gradient text-primary-foreground gap-1.5 h-8"><Save className="w-3.5 h-3.5" /> Save to Campaign</Button>}
      >
        {phase !== "done" ? (
          <div className="text-sm text-muted-foreground italic py-12 text-center">
            The AI-drafted recap will appear here after transcription.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RecapBlock title="Recap" icon={<ScrollText className="w-4 h-4" />} full><p>{recap.Recap}</p></RecapBlock>
            <RecapBlock title="NPCs" icon={<Users className="w-4 h-4" />}><ul className="space-y-1 text-sm list-disc list-inside marker:text-gold-soft">{recap.NPCs.map((n) => <li key={n}>{n}</li>)}</ul></RecapBlock>
            <RecapBlock title="Locations" icon={<MapPin className="w-4 h-4" />}><ul className="space-y-1 text-sm list-disc list-inside marker:text-gold-soft">{recap.Locations.map((n) => <li key={n}>{n}</li>)}</ul></RecapBlock>
            <RecapBlock title="Quests" icon={<Sparkles className="w-4 h-4" />}><ul className="space-y-1 text-sm list-disc list-inside marker:text-gold-soft">{recap.Quests.map((n) => <li key={n}>{n}</li>)}</ul></RecapBlock>
            <RecapBlock title="Loot" icon={<Gem className="w-4 h-4" />}><ul className="space-y-1 text-sm list-disc list-inside marker:text-gold-soft">{recap.Loot.map((n) => <li key={n}>{n}</li>)}</ul></RecapBlock>
            <RecapBlock title="Cliffhanger" icon={<Sparkles className="w-4 h-4" />} full accent><p className="italic">{recap.Cliffhanger}</p></RecapBlock>
          </div>
        )}
      </Panel>
    </div>
  );
}

function RecapBlock({ title, icon, children, full, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; full?: boolean; accent?: boolean }) {
  return (
    <div className={"ornate-frame p-4 bg-black/20 " + (full ? "md:col-span-2 " : "") + (accent ? "border-[var(--purple-arcane)]/50" : "")}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gold">{icon}</span>
        <h3 className="font-display text-sm uppercase tracking-widest text-gold">{title}</h3>
        <Badge variant="outline" className="ml-auto text-[9px] border-primary/40 text-gold-soft">Editable</Badge>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}