import "@testing-library/jest-dom/vitest";

import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { getSampleSessions } from "@/lib/session-loader/sample";

const sampleResponse = {
  sessions: getSampleSessions(),
  signatures: {},
  errors: [],
};

beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(sampleResponse), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ),
    ),
  );
});

afterEach(() => {
  const fetchMock = fetch as unknown as { mockClear?: () => void };
  fetchMock.mockClear?.();
});

afterAll(() => {
  vi.unstubAllGlobals();
});
