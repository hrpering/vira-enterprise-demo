export type ViraGuidanceExperience =
  | "advisory.special-assistance"
  | "policy.missed-flight"
  | "compliance.visa-check";

export interface ViraGuidanceResult {
  readonly version: "1";
  readonly kind: "vira.experience";
  readonly experience: ViraGuidanceExperience;
  readonly input: Readonly<Record<string, string>>;
  readonly data: Readonly<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const experiences = new Set<ViraGuidanceExperience>([
  "advisory.special-assistance",
  "policy.missed-flight",
  "compliance.visa-check",
]);

export function isViraGuidanceResult(value: unknown): value is ViraGuidanceResult {
  if (!isRecord(value)) return false;
  if (value.version !== "1" || value.kind !== "vira.experience") return false;

  const experience = value.experience;
  const input = value.input;
  const data = value.data;
  if (typeof experience !== "string" || !experiences.has(experience as ViraGuidanceExperience)) return false;
  if (!isRecord(input) || !isRecord(data)) return false;
  return Object.values(input).every((entry) => typeof entry === "string");
}
