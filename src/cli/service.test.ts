import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  generatePlist,
  getLabel,
  getLogPaths,
  getPlistPath,
} from "../../bin/service/darwin.mjs";
import {
  getScriptPath,
  isServiceCommand,
  SERVICE_COMMANDS,
} from "../../bin/service/index.mjs";
import {
  generateUnit,
  getJournalId,
  getUnitPath,
} from "../../bin/service/linux.mjs";
import { parseCliArgs } from "../../bin/talk-replay.mjs";

describe("darwin service module", () => {
  describe("getPlistPath", () => {
    it("returns correct path for default service name", () => {
      const result = getPlistPath();
      expect(result).toBe(
        path.join(homedir(), "Library", "LaunchAgents", "com.talkreplay.plist"),
      );
    });

    it("returns correct path for custom service name", () => {
      const result = getPlistPath("my-service");
      expect(result).toBe(
        path.join(
          homedir(),
          "Library",
          "LaunchAgents",
          "com.talkreplay.my-service.plist",
        ),
      );
    });
  });

  describe("getLabel", () => {
    it("returns default label for default service name", () => {
      expect(getLabel()).toBe("com.talkreplay");
    });

    it("returns custom label for custom service name", () => {
      expect(getLabel("custom")).toBe("com.talkreplay.custom");
    });
  });

  describe("getLogPaths", () => {
    it("returns log paths for default service", () => {
      const logs = getLogPaths();
      expect(logs.stdout).toBe(
        path.join(homedir(), "Library", "Logs", "talk-replay.log"),
      );
      expect(logs.stderr).toBe(
        path.join(homedir(), "Library", "Logs", "talk-replay.error.log"),
      );
    });

    it("returns log paths for custom service", () => {
      const logs = getLogPaths("custom");
      expect(logs.stdout).toBe(
        path.join(homedir(), "Library", "Logs", "talk-replay-custom.log"),
      );
    });
  });

  describe("generatePlist", () => {
    it("generates valid plist XML", () => {
      const plist = generatePlist({
        serviceName: "talk-replay",
        port: 4000,
        hostname: "127.0.0.1",
        nodePath: "/usr/bin/node",
        scriptPath: "/opt/talk-replay/bin/talk-replay.mjs",
      });

      expect(plist).toContain('<?xml version="1.0"');
      expect(plist).toContain("<key>Label</key>");
      expect(plist).toContain("<string>com.talkreplay</string>");
      expect(plist).toContain("<string>/usr/bin/node</string>");
      expect(plist).toContain(
        "<string>/opt/talk-replay/bin/talk-replay.mjs</string>",
      );
      expect(plist).toContain("<string>--port</string>");
      expect(plist).toContain("<string>4000</string>");
      expect(plist).toContain("<string>--hostname</string>");
      expect(plist).toContain("<string>127.0.0.1</string>");
      expect(plist).toContain("<key>RunAtLoad</key>");
      expect(plist).toContain("<true/>");
      expect(plist).toContain("<key>KeepAlive</key>");
    });
  });
});

describe("linux service module", () => {
  describe("getUnitPath", () => {
    it("returns correct path for default service name", () => {
      const result = getUnitPath();
      expect(result).toBe(
        path.join(
          homedir(),
          ".config",
          "systemd",
          "user",
          "talk-replay.service",
        ),
      );
    });

    it("returns correct path for custom service name", () => {
      const result = getUnitPath("my-service");
      expect(result).toBe(
        path.join(
          homedir(),
          ".config",
          "systemd",
          "user",
          "my-service.service",
        ),
      );
    });
  });

  describe("getJournalId", () => {
    it("returns the service name as journal ID", () => {
      expect(getJournalId()).toBe("talk-replay");
      expect(getJournalId("custom")).toBe("custom");
    });
  });

  describe("generateUnit", () => {
    it("generates valid systemd unit file", () => {
      const unit = generateUnit({
        serviceName: "talk-replay",
        port: 3000,
        hostname: "0.0.0.0",
        nodePath: "/usr/bin/node",
        scriptPath: "/opt/talk-replay/bin/talk-replay.mjs",
      });

      expect(unit).toContain("[Unit]");
      expect(unit).toContain("Description=TalkReplay Chat Viewer");
      expect(unit).toContain("After=network.target");
      expect(unit).toContain("[Service]");
      expect(unit).toContain("Type=simple");
      expect(unit).toContain(
        "ExecStart=/usr/bin/node /opt/talk-replay/bin/talk-replay.mjs --port 3000 --hostname 0.0.0.0",
      );
      expect(unit).toContain("Restart=on-failure");
      expect(unit).toContain("Environment=NODE_ENV=production");
      expect(unit).toContain("[Install]");
      expect(unit).toContain("WantedBy=default.target");
    });
  });
});

// win32 service module tests are skipped because node-windows is an optional dependency
// that's not installed in dev environments. The getConfigPath function is tested
// indirectly through manual testing on Windows.
describe.skip("win32 service module", () => {
  describe("getConfigPath", () => {
    it("returns correct path for default service name", async () => {
      const { getConfigPath } = await import("../../bin/service/win32.mjs");
      const result = getConfigPath();
      expect(result).toBe(
        path.join(homedir(), ".talk-replay", "talk-replay.json"),
      );
    });

    it("returns correct path for custom service name", async () => {
      const { getConfigPath } = await import("../../bin/service/win32.mjs");
      const result = getConfigPath("custom");
      expect(result).toBe(path.join(homedir(), ".talk-replay", "custom.json"));
    });
  });
});

describe("service index module", () => {
  describe("SERVICE_COMMANDS", () => {
    it("contains all expected commands", () => {
      expect(SERVICE_COMMANDS).toContain("install");
      expect(SERVICE_COMMANDS).toContain("uninstall");
      expect(SERVICE_COMMANDS).toContain("start");
      expect(SERVICE_COMMANDS).toContain("stop");
      expect(SERVICE_COMMANDS).toContain("restart");
      expect(SERVICE_COMMANDS).toContain("status");
    });
  });

  describe("isServiceCommand", () => {
    it("returns true for valid service commands", () => {
      expect(isServiceCommand("install")).toBe(true);
      expect(isServiceCommand("uninstall")).toBe(true);
      expect(isServiceCommand("start")).toBe(true);
      expect(isServiceCommand("stop")).toBe(true);
      expect(isServiceCommand("restart")).toBe(true);
      expect(isServiceCommand("status")).toBe(true);
    });

    it("returns false for invalid commands", () => {
      expect(isServiceCommand("serve")).toBe(false);
      expect(isServiceCommand("run")).toBe(false);
      expect(isServiceCommand("")).toBe(false);
    });
  });

  describe("getScriptPath", () => {
    it("returns correct script path", () => {
      const result = getScriptPath("/opt/talk-replay");
      expect(result).toBe("/opt/talk-replay/bin/talk-replay.mjs");
    });
  });
});

describe("CLI parseCliArgs with service commands", () => {
  it("parses install command", () => {
    const result = parseCliArgs(["install"], {} as NodeJS.ProcessEnv);
    expect(result.command).toBe("install");
    expect(result.port).toBe(3000);
    expect(result.hostname).toBe("0.0.0.0");
  });

  it("parses install command with options", () => {
    const result = parseCliArgs(
      ["install", "--port", "4000", "--hostname", "127.0.0.1"],
      {} as NodeJS.ProcessEnv,
    );
    expect(result.command).toBe("install");
    expect(result.port).toBe(4000);
    expect(result.hostname).toBe("127.0.0.1");
  });

  it("parses install command with --name option", () => {
    const result = parseCliArgs(
      ["install", "--name", "my-service"],
      {} as NodeJS.ProcessEnv,
    );
    expect(result.command).toBe("install");
    expect(result.serviceName).toBe("my-service");
  });

  it("parses uninstall command", () => {
    const result = parseCliArgs(["uninstall"], {} as NodeJS.ProcessEnv);
    expect(result.command).toBe("uninstall");
  });

  it("parses status command", () => {
    const result = parseCliArgs(["status"], {} as NodeJS.ProcessEnv);
    expect(result.command).toBe("status");
  });

  it("parses start command", () => {
    const result = parseCliArgs(["start"], {} as NodeJS.ProcessEnv);
    expect(result.command).toBe("start");
  });

  it("parses stop command", () => {
    const result = parseCliArgs(["stop"], {} as NodeJS.ProcessEnv);
    expect(result.command).toBe("stop");
  });

  it("parses restart command", () => {
    const result = parseCliArgs(["restart"], {} as NodeJS.ProcessEnv);
    expect(result.command).toBe("restart");
  });

  it("returns null command for server mode", () => {
    const result = parseCliArgs([], {} as NodeJS.ProcessEnv);
    expect(result.command).toBe(null);
  });

  it("parses -n shorthand for --name", () => {
    const result = parseCliArgs(
      ["install", "-n", "test"],
      {} as NodeJS.ProcessEnv,
    );
    expect(result.serviceName).toBe("test");
  });

  it("parses --name= syntax", () => {
    const result = parseCliArgs(
      ["install", "--name=custom"],
      {} as NodeJS.ProcessEnv,
    );
    expect(result.serviceName).toBe("custom");
  });

  it("throws on missing --name value", () => {
    expect(() =>
      parseCliArgs(["install", "--name"], {} as NodeJS.ProcessEnv),
    ).toThrow(/Missing value for --name/);
  });
});
