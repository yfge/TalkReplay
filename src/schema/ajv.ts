import Ajv, { type Options } from "ajv";
import addFormats from "ajv-formats";

const DEFAULT_OPTIONS: Options = {
  strict: false,
  allErrors: true,
  coerceTypes: false,
};

export function createAjv(options: Options = {}): Ajv {
  const ajv = new Ajv({ ...DEFAULT_OPTIONS, ...options });
  addFormats(ajv);
  return ajv;
}
