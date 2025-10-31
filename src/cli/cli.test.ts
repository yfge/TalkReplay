import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ensureBuildArtifacts,
  ensurePublicBridge,
  ensureStaticBridge,
  isInvokedDirectly,
  parseCliArgs,
} from "../../bin/talk-replay.mjs";

describe("parseCliArgs", () => {
  it("returns defaults when no args or env overrides are provided", () => {
    const result = parseCliArgs([], {} as NodeJS.ProcessEnv);
    expect(result.port).toBe(3000);
    expect(result.hostname).toBe("0.0.0.0");
    expect(result.help).toBe(false);
  });

  it("respects environment defaults", () => {
    const result = parseCliArgs([], {
      PORT: "4100",
      HOSTNAME: "127.0.0.1",
    } as NodeJS.ProcessEnv);
    expect(result.port).toBe(4100);
    expect(result.hostname).toBe("127.0.0.1");
  });

  it("parses --port variants", () => {
    expect(parseCliArgs(["--port", "4200"], {} as NodeJS.ProcessEnv).port).toBe(
      4200,
    );
    expect(parseCliArgs(["-p", "4300"], {} as NodeJS.ProcessEnv).port).toBe(
      4300,
    );
    expect(parseCliArgs(["--port=4400"], {} as NodeJS.ProcessEnv).port).toBe(
      4400,
    );
  });

  it("parses hostname flags", () => {
    expect(
      parseCliArgs(["--hostname", "localhost"], {} as NodeJS.ProcessEnv)
        .hostname,
    ).toBe("localhost");
    expect(
      parseCliArgs(["-H", "10.0.0.1"], {} as NodeJS.ProcessEnv).hostname,
    ).toBe("10.0.0.1");
    expect(
      parseCliArgs(["--hostname=test.local"], {} as NodeJS.ProcessEnv).hostname,
    ).toBe("test.local");
  });

  it("signals help when requested", () => {
    const result = parseCliArgs(["--help"], {} as NodeJS.ProcessEnv);
    expect(result.help).toBe(true);
  });

  it("throws on invalid port input", () => {
    expect(() =>
      parseCliArgs(["--port", "not-a-number"], {} as NodeJS.ProcessEnv),
    ).toThrow(/Invalid port/);
  });

  it("throws on unknown arguments", () => {
    expect(() =>
      parseCliArgs(["--unsupported"], {} as NodeJS.ProcessEnv),
    ).toThrow(/Unknown argument/);
  });
});

describe("ensureBuildArtifacts", () => {
  const paths = {
    packageRoot: "/tmp/project",
    standaloneDir: "/tmp/project/.next/standalone",
    serverPath: "/tmp/project/.next/standalone/server.js",
    staticDir: "/tmp/project/.next/static",
  };

  it("passes when all artifacts exist", () => {
    expect(() =>
      ensureBuildArtifacts(paths, {
        exists: () => true,
      }),
    ).not.toThrow();
  });

  it("throws when standalone directory is missing", () => {
    expect(() =>
      ensureBuildArtifacts(paths, {
        exists: (p) => p !== paths.standaloneDir,
      }),
    ).toThrow(/standalone output/);
  });

  it("throws when server.js is missing", () => {
    expect(() =>
      ensureBuildArtifacts(paths, {
        exists: (p) => p !== paths.serverPath,
      }),
    ).toThrow(/server\.js/);
  });

  it("throws when static assets are missing", () => {
    expect(() =>
      ensureBuildArtifacts(paths, {
        exists: (p) => p !== paths.staticDir,
      }),
    ).toThrow(/static/);
  });
});

describe("ensureStaticBridge", () => {
  const paths = {
    packageRoot: "/tmp/project",
    standaloneDir: "/tmp/project/.next/standalone",
    serverPath: "/tmp/project/.next/standalone/server.js",
    staticDir: "/tmp/project/.next/static",
  };

  it("creates the standalone .next directory when missing", () => {
    const mkdirCalls: string[] = [];
    ensureStaticBridge(paths, {
      exists: (p) => p === paths.staticDir,
      mkdir: (p) => mkdirCalls.push(p),
      symlink: () => {
        throw Object.assign(new Error("no symlink"), { code: "EPERM" });
      },
      copy: () => undefined,
    });
    expect(mkdirCalls).toContain(path.join(paths.standaloneDir, ".next"));
  });

  it("attempts to create a symlink before copying", () => {
    const calls = { symlink: 0, copy: 0 };
    ensureStaticBridge(paths, {
      exists: (p) => p === paths.staticDir,
      mkdir: () => undefined,
      symlink: () => {
        calls.symlink += 1;
        throw Object.assign(new Error("fail"), { code: "EPERM" });
      },
      copy: () => {
        calls.copy += 1;
      },
    });
    expect(calls.symlink).toBe(1);
    expect(calls.copy).toBe(1);
  });

  it("skips work when static bridge already exists", () => {
    const called = { symlink: 0, copy: 0 };
    const existingBridge = `${paths.standaloneDir}/.next/static`;
    ensureStaticBridge(paths, {
      exists: (p) => p === existingBridge || p === paths.staticDir,
      mkdir: () => undefined,
      symlink: () => {
        called.symlink += 1;
      },
      copy: () => {
        called.copy += 1;
      },
    });
    expect(called.symlink).toBe(0);
    expect(called.copy).toBe(0);
  });
});

describe("isInvokedDirectly", () => {
  it("returns true when module url and argv resolve to the same path", () => {
    expect(
      isInvokedDirectly(
        ["/usr/bin/node", "/tmp/cli.mjs"],
        "file:///tmp/cli.mjs",
        (value) => value,
      ),
    ).toBe(true);
  });

  it("resolves symlinks via provided realpath function", () => {
    expect(
      isInvokedDirectly(
        ["/usr/bin/node", "/usr/local/bin/talk-replay"],
        "file:///opt/pkg/bin/talk-replay.mjs",
        (value) =>
          value === "/usr/local/bin/talk-replay"
            ? "/opt/pkg/bin/talk-replay.mjs"
            : value,
      ),
    ).toBe(true);
  });

  it("returns false when realpath throws", () => {
    expect(
      isInvokedDirectly(
        ["/usr/bin/node", "/missing/script"],
        "file:///opt/pkg/bin/talk-replay.mjs",
        () => {
          throw new Error("ENOENT");
        },
      ),
    ).toBe(false);
  });
});

describe("ensurePublicBridge", () => {
  const paths = {
    packageRoot: "/tmp/project",
    standaloneDir: "/tmp/project/.next/standalone",
  };

  it("skips when source public directory is missing", () => {
    ensurePublicBridge(paths, {
      exists: (p) => p === "/tmp/project/.next/standalone/public",
      mkdir: () => undefined,
      symlink: () => {
        throw new Error("should not call");
      },
      copy: () => {
        throw new Error("should not call");
      },
    });
  });

  it("creates symlink to public directory", () => {
    const calls: string[] = [];
    ensurePublicBridge(paths, {
      exists: (p) => p === "/tmp/project/public",
      mkdir: () => undefined,
      symlink: (from, to) => {
        calls.push(`${String(from)}->${String(to)}`);
      },
      copy: () => {
        throw new Error("copy should not execute");
      },
    });
    expect(calls).toContain(
      "/tmp/project/public->/tmp/project/.next/standalone/public",
    );
  });

  it("falls back to copy when symlink fails", () => {
    let copied = false;
    ensurePublicBridge(paths, {
      exists: (p) => p === "/tmp/project/public",
      mkdir: () => undefined,
      symlink: () => {
        const error = new Error("no symlink");
        // @ts-expect-error – augment error with code
        error.code = "EPERM";
        throw error;
      },
      copy: () => {
        copied = true;
      },
    });
    expect(copied).toBe(true);
  });
});
