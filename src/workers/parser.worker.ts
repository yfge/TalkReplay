/// <reference lib="WebWorker" />

import { parseTextContent } from "@/lib/parser-core";
import type { AgentSource, ChatSession } from "@/types/chat";

interface ParserRequest {
  id: number;
  text: string;
  source: AgentSource;
}

interface ParserResponse {
  id: number;
  result?: ChatSession[];
  error?: string;
}

self.onmessage = (event: MessageEvent<ParserRequest>) => {
  const { id, text, source } = event.data;
  try {
    const result = parseTextContent(text, source);
    const response: ParserResponse = { id, result };
    (self as DedicatedWorkerGlobalScope).postMessage(response);
  } catch (error) {
    const response: ParserResponse = {
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    (self as DedicatedWorkerGlobalScope).postMessage(response);
  }
};
