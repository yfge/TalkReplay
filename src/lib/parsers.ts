import { parseTextContent } from "@/lib/parser-core";
import type { AgentSource, ChatSession } from "@/types/chat";

export { parseJsonSessions, parsePlainTextTranscript } from "@/lib/parser-core";

let parserWorker: Worker | null = null;
let requestId = 0;
const pending = new Map<
  number,
  {
    resolve: (sessions: ChatSession[]) => void;
    reject: (error: unknown) => void;
  }
>();

function ensureWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!parserWorker) {
    parserWorker = new Worker(
      new URL("../workers/parser.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    parserWorker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        id: number;
        result?: ChatSession[];
        error?: unknown;
      };
      const handler = pending.get(data.id);
      if (!handler) {
        return;
      }
      pending.delete(data.id);
      if (data.error) {
        handler.reject(data.error);
      } else {
        handler.resolve(data.result ?? []);
      }
    };
    parserWorker.onerror = (error) => {
      pending.forEach(({ reject }) => reject(error));
      pending.clear();
    };
  }
  return parserWorker;
}

export async function parseFile(
  file: File,
  source: AgentSource,
): Promise<ChatSession[]> {
  const text = await file.text();
  const worker = ensureWorker();
  if (!worker) {
    return parseTextContent(text, source);
  }

  return new Promise<ChatSession[]>((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, text, source });
  });
}

export function parseText(text: string, source: AgentSource): ChatSession[] {
  return parseTextContent(text, source);
}
