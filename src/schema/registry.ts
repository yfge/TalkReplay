import type { AnySchema } from "ajv";

import { createAjv } from "./ajv";
import type { SchemaMapping } from "./types";

export class SchemaRegistry {
  private readonly ajv = createAjv();
  private readonly mappings = new Map<string, SchemaMapping>();

  addSchema(schema: AnySchema): void {
    this.ajv.addSchema(schema);
  }

  getValidator<T = unknown>(schemaId: string) {
    const validator = this.ajv.getSchema<T>(schemaId);
    if (!validator) {
      return undefined;
    }
    return validator;
  }

  registerMapping(mapping: SchemaMapping): void {
    this.mappings.set(mapping.id, mapping);
  }

  getMapping(id: string): SchemaMapping | undefined {
    return this.mappings.get(id);
  }

  listMappings(provider?: string): SchemaMapping[] {
    if (!provider) {
      return Array.from(this.mappings.values());
    }
    return Array.from(this.mappings.values()).filter(
      (mapping) => mapping.provider === provider,
    );
  }
}

export const schemaRegistry = new SchemaRegistry();
