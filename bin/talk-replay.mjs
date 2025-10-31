#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  realpathSync,
  symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 3000;
const DEFAULT_HOSTNAME = "0.0.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function coercePort(value) {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_PORT;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid port "${value}". Provide an integer between 1 and 65535.`,
    );
  }
  return parsed;
}

export function parseCliArgs(args, env = process.env) {
  const tokens = [...args];
  let portValue = env.TALK_REPLAY_PORT ?? env.PORT ?? DEFAULT_PORT;
  let hostnameValue =
    env.TALK_REPLAY_HOSTNAME ?? env.HOSTNAME ?? DEFAULT_HOSTNAME;
  let showHelp = false;
  let showVersion = false;

  while (tokens.length > 0) {
    const token = tokens.shift();
    if (token === undefined) {
      continue;
    }
    if (token === "-h" || token === "--help") {
      showHelp = true;
      continue;
    }
    if (token === "-v" || token === "--version") {
      showVersion = true;
      continue;
    }
    if (token === "-p" || token === "--port") {
      const next = tokens.shift();
      if (next === undefined) {
        throw new Error("Missing value for --port.");
      }
      portValue = next;
      continue;
    }
    if (token.startsWith("--port=")) {
      portValue = token.split("=", 2)[1];
      continue;
    }
    if (token === "-H" || token === "--hostname") {
      const next = tokens.shift();
      if (next === undefined) {
        throw new Error("Missing value for --hostname.");
      }
      hostnameValue = next;
      continue;
    }
    if (token.startsWith("--hostname=")) {
      hostnameValue = token.split("=", 2)[1];
      continue;
    }
    throw new Error(`Unknown argument "${token}". Use --help to view options.`);
  }

  const port = coercePort(portValue);
  const hostname =
    typeof hostnameValue === "string" && hostnameValue.length > 0
      ? hostnameValue
      : DEFAULT_HOSTNAME;

  return {
    port,
    hostname,
    help: showHelp,
    version: showVersion,
  };
}

export function resolveStandalonePaths(baseDir) {
  const packageRoot = baseDir ?? path.resolve(__dirname, "..");
  const standaloneDir = path.join(packageRoot, ".next", "standalone");
  const serverPath = path.join(standaloneDir, "server.js");
  const staticDir = path.join(packageRoot, ".next", "static");
  return {
    packageRoot,
    standaloneDir,
    serverPath,
    staticDir,
  };
}

export function ensureBuildArtifacts(paths, options = { exists: existsSync }) {
  const exists = options.exists ?? existsSync;
  if (!exists(paths.standaloneDir)) {
    throw new Error(
      'Missing Next standalone output. Run "pnpm run build" before executing the CLI.',
    );
  }
  if (!exists(paths.serverPath)) {
    throw new Error(
      'Missing ".next/standalone/server.js". Run "pnpm run build" before executing the CLI.',
    );
  }
  if (!exists(paths.staticDir)) {
    throw new Error(
      'Missing ".next/static" assets. Ensure the build artifacts are packaged.',
    );
  }
}

export function ensureStaticBridge(
  paths,
  options = {
    exists: existsSync,
    mkdir: mkdirSync,
    symlink: symlinkSync,
    copy: cpSync,
  },
) {
  const {
    exists = existsSync,
    mkdir = mkdirSync,
    symlink = symlinkSync,
    copy = cpSync,
  } = options;

  const standaloneNextDir = path.join(paths.standaloneDir, ".next");
  const standaloneStaticDir = path.join(standaloneNextDir, "static");

  if (!exists(standaloneNextDir)) {
    mkdir(standaloneNextDir, { recursive: true });
  }

  if (exists(standaloneStaticDir)) {
    return;
  }

  try {
    symlink(paths.staticDir, standaloneStaticDir, "junction");
    return;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EEXIST") {
      return;
    }
    if (error && typeof error === "object" && error.code === "EISDIR") {
      return;
    }
  }

  copy(paths.staticDir, standaloneStaticDir, { recursive: true });
}

export function printHelp(logger = console.log) {
  const lines = [
    "TalkReplay CLI",
    "",
    "Usage:",
    "  talk-replay [options]",
    "",
    "Options:",
    "  -p, --port <number>       Port to listen on (default 3000 or $PORT).",
    "  -H, --hostname <value>    Hostname binding (default 0.0.0.0 or $HOSTNAME).",
    "  -h, --help                Show this help message.",
    "  -v, --version             Print the current package version.",
    "",
    "Examples:",
    "  npx talk-replay --port 4000",
    "  talk-replay -p 4100 -H 127.0.0.1",
  ];
  lines.forEach((line) => logger(line));
}

export function runCli(
  argv = process.argv.slice(2),
  options = {
    env: process.env,
    log: console.log,
    exists: existsSync,
  },
) {
  const { env = process.env, log = console.log, exists = existsSync } = options;
  const parsed = parseCliArgs(argv, env);

  if (parsed.help) {
    printHelp(log);
    return;
  }

  if (parsed.version) {
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const pkg = require("../package.json");
    log(`talk-replay v${pkg.version}`);
    return;
  }

  const paths = resolveStandalonePaths(options.packageRoot);
  ensureBuildArtifacts(paths, { exists });
  ensureStaticBridge(paths);

  env.PORT = String(parsed.port);
  env.HOSTNAME = parsed.hostname;
  if (!env.NODE_ENV) {
    env.NODE_ENV = "production";
  }
  if (!env.NEXT_TELEMETRY_DISABLED) {
    env.NEXT_TELEMETRY_DISABLED = "1";
  }

  process.chdir(paths.standaloneDir);
  log(`TalkReplay starting on http://${parsed.hostname}:${parsed.port}`);

  const require = createRequire(import.meta.url);
  require(paths.serverPath);
}

export function isInvokedDirectly(
  argv = process.argv,
  moduleUrl = import.meta.url,
  realpath = realpathSync,
) {
  if (!Array.isArray(argv) || typeof argv[1] !== "string") {
    return false;
  }
  try {
    const resolvedArg = realpath(argv[1]);
    return fileURLToPath(moduleUrl) === resolvedArg;
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  try {
    runCli();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error(message);
    process.exit(1);
  }
}
