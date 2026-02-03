/**
 * macOS launchd service management for TalkReplay
 */

import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_SERVICE_NAME = "talk-replay";
const LABEL_PREFIX = "com.talkreplay";

/**
 * Get the plist file path for a given service name
 */
export function getPlistPath(serviceName = DEFAULT_SERVICE_NAME) {
  const label =
    serviceName === DEFAULT_SERVICE_NAME
      ? LABEL_PREFIX
      : `${LABEL_PREFIX}.${serviceName}`;
  return path.join(homedir(), "Library", "LaunchAgents", `${label}.plist`);
}

/**
 * Get the service label
 */
export function getLabel(serviceName = DEFAULT_SERVICE_NAME) {
  return serviceName === DEFAULT_SERVICE_NAME
    ? LABEL_PREFIX
    : `${LABEL_PREFIX}.${serviceName}`;
}

/**
 * Get log file paths
 */
export function getLogPaths(serviceName = DEFAULT_SERVICE_NAME) {
  const logsDir = path.join(homedir(), "Library", "Logs");
  const baseName =
    serviceName === DEFAULT_SERVICE_NAME
      ? "talk-replay"
      : `talk-replay-${serviceName}`;
  return {
    stdout: path.join(logsDir, `${baseName}.log`),
    stderr: path.join(logsDir, `${baseName}.error.log`),
  };
}

/**
 * Generate plist XML content
 */
export function generatePlist(options) {
  const {
    serviceName = DEFAULT_SERVICE_NAME,
    port = 3000,
    hostname = "0.0.0.0",
    nodePath,
    scriptPath,
  } = options;

  const label = getLabel(serviceName);
  const logs = getLogPaths(serviceName);

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${scriptPath}</string>
    <string>--port</string>
    <string>${port}</string>
    <string>--hostname</string>
    <string>${hostname}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logs.stdout}</string>
  <key>StandardErrorPath</key>
  <string>${logs.stderr}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>NEXT_TELEMETRY_DISABLED</key>
    <string>1</string>
  </dict>
</dict>
</plist>
`;
  return plist;
}

/**
 * Install the service
 */
export async function install(options, logger = console) {
  const {
    serviceName = DEFAULT_SERVICE_NAME,
    port = 3000,
    hostname = "0.0.0.0",
    nodePath = process.execPath,
    scriptPath,
  } = options;

  const plistPath = getPlistPath(serviceName);
  const label = getLabel(serviceName);

  // Ensure LaunchAgents directory exists
  const launchAgentsDir = path.dirname(plistPath);
  if (!existsSync(launchAgentsDir)) {
    mkdirSync(launchAgentsDir, { recursive: true });
  }

  // Check if service is already installed
  if (existsSync(plistPath)) {
    logger.log(`Service "${label}" is already installed at ${plistPath}`);
    logger.log("Use 'talk-replay uninstall' first if you want to reinstall.");
    return false;
  }

  // Generate and write plist
  const plistContent = generatePlist({
    serviceName,
    port,
    hostname,
    nodePath,
    scriptPath,
  });

  writeFileSync(plistPath, plistContent, "utf-8");
  logger.log(`Created plist at ${plistPath}`);

  // Load the service
  try {
    execSync(`launchctl load -w "${plistPath}"`, { stdio: "pipe" });
    logger.log(`Service "${label}" installed and started successfully.`);
    logger.log(`Listening on http://${hostname}:${port}`);
    logger.log("");
    logger.log("The service will start automatically on login.");
    logger.log(`Logs: ${getLogPaths(serviceName).stdout}`);
    return true;
  } catch (error) {
    logger.error(`Failed to load service: ${error.message}`);
    // Clean up plist file on failure
    rmSync(plistPath, { force: true });
    return false;
  }
}

/**
 * Uninstall the service
 */
export async function uninstall(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const plistPath = getPlistPath(serviceName);
  const label = getLabel(serviceName);

  if (!existsSync(plistPath)) {
    logger.log(`Service "${label}" is not installed.`);
    return false;
  }

  // Unload the service
  try {
    execSync(`launchctl unload -w "${plistPath}"`, { stdio: "pipe" });
  } catch {
    // Service might not be running, continue with removal
  }

  // Remove the plist file
  rmSync(plistPath, { force: true });
  logger.log(`Service "${label}" uninstalled successfully.`);
  return true;
}

/**
 * Start the service
 */
export async function start(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const plistPath = getPlistPath(serviceName);
  const label = getLabel(serviceName);

  if (!existsSync(plistPath)) {
    logger.error(`Service "${label}" is not installed.`);
    logger.error("Run 'talk-replay install' first.");
    return false;
  }

  try {
    execSync(`launchctl start "${label}"`, { stdio: "pipe" });
    logger.log(`Service "${label}" started.`);
    return true;
  } catch (error) {
    logger.error(`Failed to start service: ${error.message}`);
    return false;
  }
}

/**
 * Stop the service
 */
export async function stop(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const plistPath = getPlistPath(serviceName);
  const label = getLabel(serviceName);

  if (!existsSync(plistPath)) {
    logger.error(`Service "${label}" is not installed.`);
    return false;
  }

  try {
    execSync(`launchctl stop "${label}"`, { stdio: "pipe" });
    logger.log(`Service "${label}" stopped.`);
    return true;
  } catch (error) {
    logger.error(`Failed to stop service: ${error.message}`);
    return false;
  }
}

/**
 * Restart the service
 */
export async function restart(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const label = getLabel(serviceName);

  await stop(options, { log: () => {}, error: () => {} });

  // Small delay to ensure service has stopped
  await new Promise((resolve) => setTimeout(resolve, 500));

  const result = await start(options, logger);
  if (result) {
    logger.log(`Service "${label}" restarted.`);
  }
  return result;
}

/**
 * Get service status
 */
export async function status(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const plistPath = getPlistPath(serviceName);
  const label = getLabel(serviceName);
  const logs = getLogPaths(serviceName);

  if (!existsSync(plistPath)) {
    logger.log(`Service "${label}" is not installed.`);
    return { installed: false, running: false };
  }

  // Check if service is running using launchctl list
  const result = spawnSync("launchctl", ["list", label], { encoding: "utf-8" });
  const isRunning = result.status === 0;

  // Parse port from plist
  let port = "unknown";
  try {
    const plistContent = readFileSync(plistPath, "utf-8");
    const portMatch = plistContent.match(
      /<string>--port<\/string>\s*<string>(\d+)<\/string>/,
    );
    if (portMatch) {
      port = portMatch[1];
    }
  } catch {
    // Ignore errors reading plist
  }

  logger.log(`Service: ${label}`);
  logger.log(`Status: ${isRunning ? "Running" : "Stopped"}`);
  logger.log(`Port: ${port}`);
  logger.log(`Plist: ${plistPath}`);
  logger.log(`Logs: ${logs.stdout}`);

  if (isRunning && result.stdout) {
    // Parse PID from launchctl list output
    const lines = result.stdout.trim().split("\n");
    for (const line of lines) {
      if (line.includes("PID")) {
        const pidLine = lines.find((l) => !l.includes("PID") && l.trim());
        if (pidLine) {
          const parts = pidLine.trim().split(/\s+/);
          if (parts[0] && parts[0] !== "-") {
            logger.log(`PID: ${parts[0]}`);
          }
        }
      }
    }
  }

  return { installed: true, running: isRunning, port };
}
