import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel } from "@/components/grimoire/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileJson, ScrollText, Sparkles, Save, Users, MapPin, Gem, Quote, AudioLines, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/post-session")({
  head: () => ({
    meta: [
      { title: "Post-Session — Grimoire" },
      { name: "description", content: "Import a D&D Listener session digest into the campaign wiki." },
      { property: "og:title", content: "Post-Session — Grimoire" },
      { property: "og:description", content: "Turn table talk into canon." },
    ],
  }),
  component: PostSession,
});

type Digest = {
  summary?: string;
  recap?: string;
  createdAt?: string;
  model?: string;
  events?: { who?: string; what: string }[];
  loot?: { item: string; recipient?: string }[];
  npcs?: { name: string }[];
  locations?: { name: string }[];
  plotThreads?: { title: string; status: string }[];
  quotes?: { speaker: string; quote: string }[];
  discarded?: string[];
};

type ListenerSession = {
  folder: string;
  createdAt?: string;
  model?: string;
  summary?: string;
};

type Proposal = {
  key: string;
  action: "create" | "update";
  type: string;
  id: string | null;
  name: string;
  summary: string;
  fields: Record<string, unknown>;
  body: string | null;
};

function PostSession() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [fileName, setFileName] = useState("");
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  const { data: listenerSessions } = useQuery({
    queryKey: ["listener-sessions"],
    queryFn: async () => {
      const r = await fetch("/api/listener/sessions");
      if (!r.ok) return [];
      return ((await r.json()) as { sessions: ListenerSession[] }).sessions;
    },
  });

  const loadDigest = async (parsed: Digest, label: string) => {
    try {
      if (!parsed.summary && !parsed.npcs && !parsed.plotThreads) {
        throw new Error("that file doesn't look like a session-digest.json");
      }
      setDigest(parsed);
      setFileName(label);
      setApplied(false);
      setBusy(true);
      const r = await fetch("/api/import/digest/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest: parsed }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? r.statusText);
      const { proposals } = (await r.json()) as { proposals: Proposal[] };
      setProposals(proposals);
      setAccepted(new Set(proposals.map((p) => p.key)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the digest");
    } finally {
      setBusy(false);
    }
  };

  const loadFile = async (file: File) => {
    try {
      await loadDigest(JSON.parse(await file.text()) as Digest, file.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the digest");
    }
  };

  const loadFromListener = async (folder: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/listener/sessions/${encodeURIComponent(folder)}`);
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? r.statusText);
      const { digest } = (await r.json()) as { digest: Digest };
      await loadDigest(digest, folder);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the session");
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!proposals) return;
    setBusy(true);
    try {
      const chosen = proposals.filter((p) => accepted.has(p.key));
      const r = await fetch("/api/import/digest/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposals: chosen }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? r.statusText);
      const { results, backup } = (await r.json()) as {
        results: { key: string; ok: boolean; id?: string; error?: string }[];
        backup: string | null;
      };
      qc.invalidateQueries({ queryKey: ["campaign"] });
      qc.invalidateQueries({ queryKey: ["party"] });
      const failed = results.filter((x) => !x.ok);
      const okCount = results.length - failed.length;
      if (failed.length) {
        toast.warning(`${okCount} applied, ${failed.length} failed: ${failed[0].error}`);
      } else {
        toast.success(`${okCount} change(s) written to the campaign` + (backup ? ` (backup: ${backup})` : ""));
      }
      setApplied(true);
      const recap = results.find((x) => x.ok && x.id?.startsWith("recap-"));
      if (recap?.id) navigate({ to: "/campaign", search: { open: recap.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-soft">
          <div className="w-8 h-px bg-gold-gradient" /> After the table clears
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider">Post-Session</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Record and process the session with D&D Listener, then import its digest here.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Session Digest" icon={<AudioLines className="w-4 h-4" />} accent="purple">
          {!!listenerSessions?.length && (
            <div className="mb-4 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold-soft">
                From D&D Listener
              </div>
              <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {listenerSessions.map((s) => (
                  <li key={s.folder}>
                    <button
                      onClick={() => void loadFromListener(s.folder)}
                      disabled={busy}
                      className={
                        "w-full text-left ornate-frame bg-black/20 p-2.5 transition hover:border-primary/60 cursor-pointer " +
                        (fileName === s.folder ? "border-primary/70" : "")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm text-gold">{s.folder}</span>
                        {s.createdAt && (
                          <span className="text-[10px] text-muted-foreground">{s.createdAt.slice(0, 10)}</span>
                        )}
                      </div>
                      {s.summary && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.summary}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div
            className="ornate-frame p-6 text-center bg-black/20 cursor-pointer"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void loadFile(f);
            }}
          >
            <div className="w-14 h-14 rounded-full bg-arcane grid place-items-center mx-auto shadow-arcane">
              <FileJson className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="mt-3 font-display text-lg text-gold">
              {fileName || (listenerSessions?.length ? "…or drop a session-digest.json" : "Drop session-digest.json")}
            </div>
            <div className="text-xs text-muted-foreground">
              {digest
                ? [digest.createdAt?.slice(0, 10), digest.model && `digested by ${digest.model}`]
                    .filter(Boolean)
                    .join(" · ")
                : "…or click to choose the file from your session folder"}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {digest && (
            <div className="mt-4 space-y-3 text-sm">
              {digest.summary && <p>{digest.summary}</p>}
              <div className="flex flex-wrap gap-1.5">
                <CountBadge icon={<Users className="w-3 h-3" />} label="NPCs" count={digest.npcs?.length} />
                <CountBadge icon={<MapPin className="w-3 h-3" />} label="Locations" count={digest.locations?.length} />
                <CountBadge icon={<Sparkles className="w-3 h-3" />} label="Threads" count={digest.plotThreads?.length} />
                <CountBadge icon={<Gem className="w-3 h-3" />} label="Loot" count={digest.loot?.length} />
                <CountBadge icon={<Quote className="w-3 h-3" />} label="Quotes" count={digest.quotes?.length} />
              </div>
              {digest.recap && (
                <blockquote className="ornate-frame bg-black/20 p-3 italic text-muted-foreground">
                  {digest.recap}
                </blockquote>
              )}
              {!!digest.discarded?.length && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold-soft" />
                  <span>
                    {digest.discarded.length} item(s) were discarded by the listener's grounding check
                    and are not part of this import.
                  </span>
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title="Proposed Changes"
          icon={<ScrollText className="w-4 h-4" />}
          accent="emerald"
          actions={
            proposals && !applied ? (
              <Button
                size="sm"
                onClick={apply}
                disabled={busy || accepted.size === 0}
                className="bg-gold-gradient text-primary-foreground gap-1.5 h-8"
              >
                <Save className="w-3.5 h-3.5" />
                {busy ? "Writing…" : `Apply ${accepted.size} of ${proposals.length}`}
              </Button>
            ) : undefined
          }
        >
          {!proposals ? (
            <div className="text-sm text-muted-foreground italic py-12 text-center">
              {busy ? "Reading the digest…" : "Proposals appear here once a digest is loaded — nothing is written without your review."}
            </div>
          ) : applied ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              Applied. The recap is in the campaign wiki — load another digest to import the next session.
            </div>
          ) : (
            <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {proposals.map((p) => (
                <li key={p.key} className="ornate-frame bg-black/20 p-3 flex items-start gap-3">
                  <Checkbox
                    checked={accepted.has(p.key)}
                    onCheckedChange={(on) => {
                      setAccepted((prev) => {
                        const next = new Set(prev);
                        if (on === true) next.add(p.key);
                        else next.delete(p.key);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={
                          "text-[9px] uppercase " +
                          (p.action === "create"
                            ? "border-[var(--emerald,#10b981)]/50 text-emerald-400"
                            : "border-primary/40 text-gold-soft")
                        }
                      >
                        {p.action === "create" ? "new" : "update"} {p.type}
                      </Badge>
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.summary}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function CountBadge({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <Badge variant="outline" className="gap-1 border-primary/30 text-muted-foreground">
      {icon} {count ?? 0} {label}
    </Badge>
  );
}
