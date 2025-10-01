import type { ProviderPaths } from "@/config/providerPaths";
// eslint-disable-next-line import/order
import { sampleSessions } from "@/data/sampleSessions";

export function loadSessionsFromProviders(paths: ProviderPaths) {
  void paths;
  return Promise.resolve(sampleSessions);
}
