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
  status?: string;
  renamedFrom?: string;
  renamedTo?: string;
  binary?: boolean;
  hunks: DiffHunk[];
};

const HUNK_RE = /^@@\s+-([0-9]+)(?:,([0-9]+))?\s+\+([0-9]+)(?:,([0-9]+))?\s+@@/;

// Minimal unified diff parser (best-effort). Ignores headers it can't parse.
export function parseUnifiedDiff(input: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = input.split(/\r?\n/);
  let cur: DiffFile | undefined;
  let hunk: DiffHunk | undefined;

  const startNewFile = (oldPath?: string, newPath?: string) => {
    cur = { oldPath, newPath, hunks: [] };
    files.push(cur);
  };

  for (const raw of lines) {
    // Rename/Copy headers (git diff --summary or extended headers)
    if (raw.startsWith("rename from ")) {
      if (!cur) startNewFile();
      if (!cur) continue;
      cur.status = cur.status ?? "rename";
      cur.renamedFrom = raw.slice("rename from ".length).trim();
      continue;
    }
    if (raw.startsWith("rename to ")) {
      if (!cur) startNewFile();
      if (!cur) continue;
      cur.status = cur.status ?? "rename";
      cur.renamedTo = raw.slice("rename to ".length).trim();
      continue;
    }
    if (raw.startsWith("copy from ")) {
      if (!cur) startNewFile();
      if (!cur) continue;
      cur.status = cur.status ?? "copy";
      cur.renamedFrom = raw.slice("copy from ".length).trim();
      continue;
    }
    if (raw.startsWith("copy to ")) {
      if (!cur) startNewFile();
      if (!cur) continue;
      cur.status = cur.status ?? "copy";
      cur.renamedTo = raw.slice("copy to ".length).trim();
      continue;
    }
    if (raw.startsWith("Binary files ")) {
      if (!cur) startNewFile();
      if (!cur) continue;
      cur.binary = true;
      // best-effort parse paths
      const m2 = raw.match(/^Binary files\s+(.+)\s+and\s+(.+)\s+differ/);
      if (m2) {
        const a = m2[1]?.trim();
        const b = m2[2]?.trim();
        cur.oldPath = cur.oldPath ?? a;
        cur.newPath = cur.newPath ?? b;
      }
      continue;
    }
    if (raw.startsWith("--- ")) {
      const p = raw.slice(4).trim();
      if (!cur || cur.hunks.length > 0) startNewFile(p, cur?.newPath);
      else cur.oldPath = cur.oldPath ?? p;
      hunk = undefined;
      continue;
    }
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).trim();
      if (!cur || cur.hunks.length > 0) startNewFile(cur?.oldPath, p);
      else cur.newPath = cur.newPath ?? p;
      hunk = undefined;
      continue;
    }
    const m = raw.match(HUNK_RE);
    if (m) {
      const oldStart = Number(m[1] ?? 0);
      const oldLines = m[2] ? Number(m[2]) : undefined;
      const newStart = Number(m[3] ?? 0);
      const newLines = m[4] ? Number(m[4]) : undefined;
      if (!cur) startNewFile();
      if (!cur) continue;
      hunk = { oldStart, oldLines, newStart, newLines, lines: [] };
      cur.hunks.push(hunk);
      continue;
    }
    if (!cur) continue;
    if (!hunk) {
      hunk = { oldStart: 0, newStart: 0, lines: [] };
      cur.hunks.push(hunk);
    }
    if (raw.startsWith("+"))
      hunk.lines.push({ type: "add", text: raw.slice(1) });
    else if (raw.startsWith("-"))
      hunk.lines.push({ type: "del", text: raw.slice(1) });
    else if (raw.startsWith(" "))
      hunk.lines.push({ type: "context", text: raw.slice(1) });
    else if (raw.length === 0) hunk.lines.push({ type: "context", text: "" });
  }
  return files.filter((f) => f.hunks.length > 0 || f.oldPath || f.newPath);
}
