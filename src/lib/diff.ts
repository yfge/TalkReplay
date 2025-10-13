export type DiffLine = { type: "context" | "add" | "del"; text: string };
export type DiffHunk = {
  oldStart: number;
  oldLines?: number;
  newStart: number;
  newLines?: number;
  lines: DiffLine[];
};
export type DiffFile = {
  oldPath?: string;
  newPath?: string;
  hunks: DiffHunk[];
};

const HUNK_RE = /^@@\s+-([0-9]+)(?:,([0-9]+))?\s+\+([0-9]+)(?:,([0-9]+))?\s+@@/;

// Minimal unified diff parser (best-effort). Ignores headers it can't parse.
export function parseUnifiedDiff(input: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = input.split(/\r?\n/);
  let current: DiffFile | null = null;
  let hunk: DiffHunk | null = null;

  const startNewFile = (oldPath?: string, newPath?: string) => {
    if (!current) {
      current = { oldPath, newPath, hunks: [] };
      files.push(current);
      return;
    }
    // If we're still on the header (no hunks yet), enrich paths on current file
    if (current.hunks.length === 0 && (oldPath || newPath)) {
      if (oldPath) current.oldPath = oldPath;
      if (newPath) current.newPath = newPath;
      return;
    }
    // Otherwise start a new file patch
    current = { oldPath, newPath, hunks: [] };
    files.push(current);
  };

  for (const raw of lines) {
    if (raw.startsWith("--- ")) {
      const p = raw.slice(4).trim();
      startNewFile(p, undefined);
      hunk = null;
      continue;
    }
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).trim();
      startNewFile(undefined, p);
      hunk = null;
      continue;
    }
    const m = raw.match(HUNK_RE);
    if (m) {
      const oldStart = Number(m[1] ?? 0);
      const oldLines = m[2] ? Number(m[2]) : undefined;
      const newStart = Number(m[3] ?? 0);
      const newLines = m[4] ? Number(m[4]) : undefined;
      if (!current) startNewFile();
      hunk = { oldStart, oldLines, newStart, newLines, lines: [] };
      (current as DiffFile).hunks.push(hunk);
      continue;
    }
    if (!current) continue;
    if (!hunk) {
      // tolerate diffs without explicit hunk headers by creating a default hunk
      hunk = { oldStart: 0, newStart: 0, lines: [] };
      (current as DiffFile).hunks.push(hunk);
    }
    if (raw.startsWith("+"))
      hunk.lines.push({ type: "add", text: raw.slice(1) });
    else if (raw.startsWith("-"))
      hunk.lines.push({ type: "del", text: raw.slice(1) });
    else if (raw.startsWith(" "))
      hunk.lines.push({ type: "context", text: raw.slice(1) });
    else if (raw.length === 0) hunk.lines.push({ type: "context", text: "" });
    // lines starting with other prefixes are ignored
  }
  return files.filter((f) => f.hunks.length > 0 || f.oldPath || f.newPath);
}
