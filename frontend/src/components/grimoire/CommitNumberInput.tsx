import { useState } from "react";

/** Number input backed by server state. Buffers keystrokes locally while
 * focused and commits on blur/Enter — a live-synced controlled input would
 * re-render mid-typing and eat digits. */
export function CommitNumberInput({
  value,
  onCommit,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      value={draft ?? value}
      onFocus={(e) => {
        setDraft(String(value));
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft != null) {
          const n = Number(draft);
          onCommit(Number.isNaN(n) ? 0 : n);
          setDraft(null);
        }
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
