/**
 * Windows service management for TalkReplay using node-windows
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_SERVICE_NAME = "talk-replay";

/**
 * Get the config file path for service settings
 */
export function getConfigPath(serviceName = DEFAULT_SERVICE_NAME) {
  const configDir = path.join(homedir(), ".talk-replay");
  return path.join(configDir, `${serviceName}.json`);
}

/**
 * Try to load node-windows module
 */
async function loadNodeWindows(logger = console) {
  try {
    const nodeWindows = await import("node-windows");
    return nodeWindows;
  } catch {
    logger.error("node-windows is not installed.");
    logger.error("");
    logger.error("To use Windows service management, install node-windows:");
    logger.error("  npm install -g node-windows");
    logger.error("  npm link node-windows");
    logger.error("");
    logger.error("Or install it in the project:");
    logger.error("  npm install node-windows");
    return null;
  }
}

/**
 * Create a Service instance
 */
function createService(nodeWindows, options) {
  const {
    serviceName = DEFAULT_SERVICE_NAME,
    port = 3000,
    hostname = "0.0.0.0",
    scriptPath,
  } = options;

  const Service = nodeWindows.Service;
  const svc = new Service({
    name: serviceName,
    description: "TalkReplay Chat Viewer",
    script: scriptPath,
    scriptOptions: `--port ${port} --hostname ${hostname}`,
    env: [
      { name: "NODE_ENV", value: "production" },
      { name: "NEXT_TELEMETRY_DISABLED", value: "1" },
    ],
  });

  return svc;
}

/**
 * Save service configuration
 */
function saveConfig(options) {
  const {
    serviceName = DEFAULT_SERVICE_NAME,
    port,
    hostname,
    scriptPath,
  } = options;
  const configPath = getConfigPath(serviceName);
  const configDir = path.dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const config = { serviceName, port, hostname, scriptPath };
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  return configPath;
}

/**
 * Load service configuration
 */
function loadConfig(serviceName = DEFAULT_SERVICE_NAME) {
  const configPath = getConfigPath(serviceName);
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Delete service configuration
 */
function deleteConfig(serviceName = DEFAULT_SERVICE_NAME) {
  const configPath = getConfigPath(serviceName);
  if (existsSync(configPath)) {
    rmSync(configPath, { force: true });
  }
}

/**
 * Install the service
 */
export async function install(options, logger = console) {
  const {
    serviceName = DEFAULT_SERVICE_NAME,
    port = 3000,
    hostname = "0.0.0.0",
    scriptPath,
  } = options;

  const nodeWindows = await loadNodeWindows(logger);
  if (!nodeWindows) {
    return false;
  }

  // Check if already installed
  const existingConfig = loadConfig(serviceName);
  if (existingConfig) {
    logger.log(`Service "${serviceName}" is already installed.`);
    logger.log("Use 'talk-replay uninstall' first if you want to reinstall.");
    return false;
  }

  const svc = createService(nodeWindows, {
    serviceName,
    port,
    hostname,
    scriptPath,
  });

  return new Promise((resolve) => {
    svc.on("install", () => {
      saveConfig({ serviceName, port, hostname, scriptPath });
      logger.log(`Service "${serviceName}" installed successfully.`);
      logger.log(`Listening on http://${hostname}:${port}`);
      logger.log("");
      logger.log("The service will start automatically on system boot.");
      logger.log("You can manage it from Windows Services (services.msc).");

      // Start the service after install
      svc.start();
      resolve(true);
    });

    svc.on("alreadyinstalled", () => {
      logger.log(`Service "${serviceName}" is already installed.`);
      resolve(false);
    });

    svc.on("error", (err) => {
      logger.error(`Failed to install service: ${err}`);
      resolve(false);
    });

    svc.install();
  });
}

/**
 * Uninstall the service
 */
export async function uninstall(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;

  const config = loadConfig(serviceName);
  if (!config) {
    logger.log(`Service "${serviceName}" is not installed.`);
    return false;
  }

  const nodeWindows = await loadNodeWindows(logger);
  if (!nodeWindows) {
    return false;
  }

  const svc = createService(nodeWindows, config);

  return new Promise((resolve) => {
    svc.on("uninstall", () => {
      deleteConfig(serviceName);
      logger.log(`Service "${serviceName}" uninstalled successfully.`);
      resolve(true);
    });

    svc.on("error", (err) => {
      logger.error(`Failed to uninstall service: ${err}`);
      resolve(false);
    });

    svc.uninstall();
  });
}

/**
 * Start the service
 */
export async function start(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;

  const config = loadConfig(serviceName);
  if (!config) {
    logger.error(`Service "${serviceName}" is not installed.`);
    logger.error("Run 'talk-replay install' first.");
    return false;
  }

  const nodeWindows = await loadNodeWindows(logger);
  if (!nodeWindows) {
    return false;
  }

  const svc = createService(nodeWindows, config);

  return new Promise((resolve) => {
    svc.on("start", () => {
      logger.log(`Service "${serviceName}" started.`);
      resolve(true);
    });

    svc.on("error", (err) => {
      logger.error(`Failed to start service: ${err}`);
      resolve(false);
    });

    svc.start();
  });
}

/**
 * Stop the service
 */
export async function stop(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;

  const config = loadConfig(serviceName);
  if (!config) {
    logger.error(`Service "${serviceName}" is not installed.`);
    return false;
  }

  const nodeWindows = await loadNodeWindows(logger);
  if (!nodeWindows) {
    return false;
  }

  const svc = createService(nodeWindows, config);

  return new Promise((resolve) => {
    svc.on("stop", () => {
      logger.log(`Service "${serviceName}" stopped.`);
      resolve(true);
    });

    svc.on("error", (err) => {
      logger.error(`Failed to stop service: ${err}`);
      resolve(false);
    });

    svc.stop();
  });
}

/**
 * Restart the service
 */
export async function restart(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;

  await stop(options, { log: () => {}, error: () => {} });

  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const result = await start(options, logger);
  if (result) {
    logger.log(`Service "${serviceName}" restarted.`);
  }
  return result;
}

/**
 * Get service status
 */
export async function status(options, logger = console) {
  const { serviceName = DEFAULT_SERVICE_NAME } = options;

  const config = loadConfig(serviceName);
  if (!config) {
    logger.log(`Service "${serviceName}" is not installed.`);
    return { installed: false, running: false };
  }

  // Use PowerShell to check service status
  const result = spawnSync(
    "powershell",
    [
      "-Command",
      `Get-Service -Name "${serviceName}" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status`,
    ],
    { encoding: "utf-8" },
  );

  const statusOutput = result.stdout.trim();
  const isRunning = statusOutput === "Running";

  logger.log(`Service: ${serviceName}`);
  logger.log(`Status: ${statusOutput || "Unknown"}`);
  logger.log(`Port: ${config.port}`);
  logger.log(`Config: ${getConfigPath(serviceName)}`);
  logger.log("");
  logger.log("Manage via: services.msc");

  return { installed: true, running: isRunning, port: config.port };
}
