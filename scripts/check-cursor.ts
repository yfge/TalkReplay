#!/usr/bin/env -S pnpm dlx tsx
/**
 * Simple utility to inspect Cursor sessions detected by the loader.
 *
 * Usage:
 *   pnpm dlx tsx scripts/check-cursor.ts [absolute-path-to-cursor-root]
 *
 * When no path is provided, the script tries CURSOR_ROOT/NEXT_PUBLIC_CURSOR_ROOT
 * and finally falls back to the default OS-specific Cursor directory.
 */

import { loadCursorSessions } from "@/lib/providers/cursor";
import {
  normalizeProviderRoot,
  resolveDefaultProviderRoot,
} from "@/lib/session-loader/server";

function printBanner(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${message} ===`);
}

async function resolveCursorRoot(): Promise<string | undefined> {
  const cliRoot = process.argv[2];
  const envRoot =
    process.env.CURSOR_ROOT ?? process.env.NEXT_PUBLIC_CURSOR_ROOT;

  const candidates = [cliRoot, envRoot];
  // eslint-disable-next-line no-restricted-syntax
  for (const candidate of candidates) {
    if (!candidate) {
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { path, error } = await normalizeProviderRoot(candidate);
    if (path) {
      return path;
    }
    if (error) {
      printBanner("Cursor path resolution failed");
      // eslint-disable-next-line no-console
      console.error(`${candidate}: ${error}`);
    }
  }

  return resolveDefaultProviderRoot("cursor");
}

async function main() {
  const root = await resolveCursorRoot();
  if (!root) {
    // eslint-disable-next-line no-console
    console.error(
      "Unable to determine Cursor root. Pass the path explicitly or set CURSOR_ROOT.",
    );
    process.exitCode = 1;
    return;
  }

  printBanner(`Using Cursor root: ${root}`);

  try {
    const result = await loadCursorSessions(root, {}, new Map());
    printBanner("Summary");
    // eslint-disable-next-line no-console
    console.log(
      `Loaded ${result.sessions.length} sessions (${result.errors.length} errors)`,
    );
    if (result.errors.length > 0) {
      printBanner("Errors");
      result.errors.forEach((error) => {
        // eslint-disable-next-line no-console
        console.error(`[${error.provider}] ${error.reason}`);
      });
    }
    const sample = result.sessions.slice(0, 10);
    if (sample.length === 0) {
      printBanner("No sessions returned");
      return;
    }
    printBanner(`First ${sample.length} sessions`);
    sample.forEach((session, index) => {
      const assistantReplies = session.messages.filter(
        (message) => message.role === "assistant",
      );
      const attachments = assistantReplies.flatMap(
        (message) => message.metadata?.attachments ?? [],
      );
      // eslint-disable-next-line no-console
      console.log(
        [
          `${index + 1}. ${session.topic}`,
          `  Started: ${session.startedAt}`,
          `  Messages: ${session.messages.length}`,
          `  Assistant replies: ${assistantReplies.length}`,
          `  Attachments: ${attachments.length}`,
          attachments.slice(0, 3).map((attachment) => {
            const name = attachment.name ?? attachment.uri ?? "(unnamed)";
            return `    - ${attachment.type}: ${name}`;
          }),
        ]
          .flat()
          .join("\n"),
      );
    });
  } catch (error) {
    printBanner("Unexpected failure");
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error(error.stack ?? error.message);
    } else {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    process.exitCode = 1;
  }
}

void main();
