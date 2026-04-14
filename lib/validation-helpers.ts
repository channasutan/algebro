export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isOptionalString(v: unknown): boolean {
  return v === undefined || v === null || typeof v === "string";
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
