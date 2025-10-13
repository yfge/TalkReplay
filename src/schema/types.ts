export type TransformName =
  | "iso-timestamp"
  | "exit-code"
  | "duration-ms"
  | "seconds-to-ms"
  | "stringify"
  | "parse-json"
  | "parse-diff"
  | "identity"
  | "set-constant"
  | "coalesce"
  | "command-tool-type"
  | "map-tool-name"
  | "collect-file-change-paths"
  | "extract-json-property";

export interface TransformDefinition {
  name: TransformName;
  options?: Record<string, unknown>;
}

export interface MappingCondition {
  /** JSON pointer (relative) used to evaluate condition */
  path: string;
  /** Value that must match for the rule to apply */
  equals: unknown;
}

export interface MappingRule {
  /** JSON pointer (relative to payload root) */
  source: string;
  /** Dot-separated path on the target message object */
  target: string;
  transform?: TransformName | TransformDefinition;
  when?: MappingCondition[];
}

export type NormalisedKind =
  | "tool-call"
  | "tool-result"
  | "message"
  | "reasoning"
  | "system-as-tool";

export interface SchemaMapping {
  /** Provider identifier, e.g. `codex`, `claude`. */
  provider: string;
  /** Unique mapping id (e.g. `codex/item.command_execution`). */
  id: string;
  /** Kind of message produced after normalisation. */
  kind: NormalisedKind;
  /** JSON schema $id for validation. */
  schemaId: string;
  /** Mapping rules that transform payload into ChatMessage fields. */
  rules: MappingRule[];
}
