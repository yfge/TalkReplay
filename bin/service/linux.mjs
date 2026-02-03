/**
 * Linux systemd service management for TalkReplay
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

/**
 * Get the systemd user unit file path
 */
export function getUnitPath(serviceName = DEFAULT_SERVICE_NAME) {
  return path.join(
    homedir(),
    ".config",
    "systemd",
    "user",
    `${serviceName}.service`,
  );
}

/**
 * Get log journal identifier
 */
export function getJournalId(serviceName = DEFAULT_SERVICE_NAME) {
  return serviceName;
}

/**
 * Generate systemd unit file content
 */
export function generateUnit(options) {
  const {
    serviceName = DEFAULT_SERVICE_NAME,
    port = 3000,
    hostname = "0.0.0.0",
    nodePath,
    scriptPath,
  } = options;

  const unit = `[Unit]
Description=TalkReplay Chat Viewer
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${scriptPath} --port ${port} --hostname ${hostname}
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1

[Install]
WantedBy=default.target
`;
  return unit;
}

/**
 * Check if systemctl --user is available
 */
function checkSystemctl() {
  const result = spawnSync("systemctl", ["--user", "--version"], {
    encoding: "utf-8",
  });
  return result.status === 0;
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

  if (!checkSystemctl()) {
    logger.error("systemctl --user is not available on this system.");
    logger.error("Make sure you have systemd user services enabled.");
    return false;
  }

  const unitPath = getUnitPath(serviceName);

  // Ensure systemd user directory exists
  const systemdUserDir = path.dirname(unitPath);
  if (!existsSync(systemdUserDir)) {
    mkdirSync(systemdUserDir, { recursive: true });
  }

  // Check if service is already installed
  if (existsSync(unitPath)) {
    logger.log(`Service "${serviceName}" is already installed at ${unitPath}`);
    logger.log("Use 'talk-replay uninstall' first if you want to reinstall.");
    return false;
  }

  // Generate and write unit file
  const unitContent = generateUnit({
    serviceName,
    port,
    hostname,
    nodePath,
    scriptPath,
  });

  writeFileSync(unitPath, unitContent, "utf-8");
  logger.log(`Created systemd unit at ${unitPath}`);

  // Reload systemd daemon
  try {
    execSync("systemctl --user daemon-reload", { stdio: "pipe" });
  } catch (error) {
    logger.error(`Failed to reload systemd: ${error.message}`);
    rmSync(unitPath, { force: true });
    return false;
  }

  // Enable and start the service
  try {
    execSync(`systemctl --user enable ${serviceName}`, { stdio: "pipe" });
    execSync(`systemctl --user start ${serviceName}`, { stdio: "pipe" });
    logger.log(`Service "${serviceName}" installed and started successfully.`);
    logger.log(`Listening on http://${hostname}:${port}`);
    logger.log("");
    logger.log("The service will start automatically on login.");
    logger.log(`View logs with: journalctl --user -u ${serviceName} -f`);
    return true;
  } catch (error) {
    logger.error(`Failed to enable/start service: ${error.message}`);
    rmSync(unitPath, { force: true });
    return false;
  }
}

/**
 * Uninstall the service
 */
export async function uninstall(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const unitPath = getUnitPath(serviceName);

  if (!existsSync(unitPath)) {
    logger.log(`Service "${serviceName}" is not installed.`);
    return false;
  }

  // Stop and disable the service
  try {
    execSync(`systemctl --user stop ${serviceName}`, { stdio: "pipe" });
  } catch {
    // Service might not be running
  }

  try {
    execSync(`systemctl --user disable ${serviceName}`, { stdio: "pipe" });
  } catch {
    // Service might not be enabled
  }

  // Remove the unit file
  rmSync(unitPath, { force: true });

  // Reload systemd daemon
  try {
    execSync("systemctl --user daemon-reload", { stdio: "pipe" });
  } catch {
    // Ignore reload errors
  }

  logger.log(`Service "${serviceName}" uninstalled successfully.`);
  return true;
}

/**
 * Start the service
 */
export async function start(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const unitPath = getUnitPath(serviceName);

  if (!existsSync(unitPath)) {
    logger.error(`Service "${serviceName}" is not installed.`);
    logger.error("Run 'talk-replay install' first.");
    return false;
  }

  try {
    execSync(`systemctl --user start ${serviceName}`, { stdio: "pipe" });
    logger.log(`Service "${serviceName}" started.`);
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
  const unitPath = getUnitPath(serviceName);

  if (!existsSync(unitPath)) {
    logger.error(`Service "${serviceName}" is not installed.`);
    return false;
  }

  try {
    execSync(`systemctl --user stop ${serviceName}`, { stdio: "pipe" });
    logger.log(`Service "${serviceName}" stopped.`);
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
  const unitPath = getUnitPath(serviceName);

  if (!existsSync(unitPath)) {
    logger.error(`Service "${serviceName}" is not installed.`);
    logger.error("Run 'talk-replay install' first.");
    return false;
  }

  try {
    execSync(`systemctl --user restart ${serviceName}`, { stdio: "pipe" });
    logger.log(`Service "${serviceName}" restarted.`);
    return true;
  } catch (error) {
    logger.error(`Failed to restart service: ${error.message}`);
    return false;
  }
}

/**
 * Get service status
 */
export async function status(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;
  const unitPath = getUnitPath(serviceName);

  if (!existsSync(unitPath)) {
    logger.log(`Service "${serviceName}" is not installed.`);
    return { installed: false, running: false };
  }

  // Get service status
  const result = spawnSync("systemctl", ["--user", "is-active", serviceName], {
    encoding: "utf-8",
  });
  const isRunning = result.stdout.trim() === "active";

  // Parse port from unit file
  let port = "unknown";
  try {
    const unitContent = readFileSync(unitPath, "utf-8");
    const portMatch = unitContent.match(/--port\s+(\d+)/);
    if (portMatch) {
      port = portMatch[1];
    }
  } catch {
    // Ignore errors reading unit file
  }

  // Get more detailed status
  const statusResult = spawnSync(
    "systemctl",
    ["--user", "status", serviceName],
    {
      encoding: "utf-8",
    },
  );

  logger.log(`Service: ${serviceName}`);
  logger.log(`Status: ${isRunning ? "Running" : "Stopped"}`);
  logger.log(`Port: ${port}`);
  logger.log(`Unit: ${unitPath}`);

  // Extract PID if running
  if (isRunning && statusResult.stdout) {
    const pidMatch = statusResult.stdout.match(/Main PID:\s*(\d+)/);
    if (pidMatch) {
      logger.log(`PID: ${pidMatch[1]}`);
    }
  }

  logger.log("");
  logger.log(`View logs: journalctl --user -u ${serviceName} -f`);

  return { installed: true, running: isRunning, port };
}
