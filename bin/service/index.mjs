/**
 * Platform-agnostic service management for TalkReplay
 * Routes to platform-specific implementations based on process.platform
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the platform-specific service module
 */
async function getPlatformModule() {
  const platform = process.platform;

  switch (platform) {
    case "darwin":
      return import("./darwin.mjs");
    case "linux":
      return import("./linux.mjs");
    case "win32":
      return import("./win32.mjs");
    default:
      throw new Error(
        `Unsupported platform: ${platform}. Service management is only supported on macOS, Linux, and Windows.`,
      );
  }
}

/**
 * Get the script path for the CLI entry point
 */
export function getScriptPath(packageRoot) {
  return path.join(packageRoot, "bin", "talk-replay.mjs");
}

/**
 * Install the service
 */
export async function install(options, logger = console) {
  const mod = await getPlatformModule();
  return mod.install(options, logger);
}

/**
 * Uninstall the service
 */
export async function uninstall(options, logger = console) {
  const mod = await getPlatformModule();
  return mod.uninstall(options, logger);
}

/**
 * Start the service
 */
export async function start(options, logger = console) {
  const mod = await getPlatformModule();
  return mod.start(options, logger);
}

/**
 * Stop the service
 */
export async function stop(options, logger = console) {
  const mod = await getPlatformModule();
  return mod.stop(options, logger);
}

/**
 * Restart the service
 */
export async function restart(options, logger = console) {
  const mod = await getPlatformModule();
  return mod.restart(options, logger);
}

/**
 * Get service status
 */
export async function status(options, logger = console) {
  const mod = await getPlatformModule();
  return mod.status(options, logger);
}

/**
 * Service commands enumeration
 */
export const SERVICE_COMMANDS = [
  "install",
  "uninstall",
  "start",
  "stop",
  "restart",
  "status",
];

/**
 * Check if an argument is a service command
 */
export function isServiceCommand(arg) {
  return SERVICE_COMMANDS.includes(arg);
}
