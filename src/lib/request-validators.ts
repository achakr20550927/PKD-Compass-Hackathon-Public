export function asTrimmedString(value: unknown, maxLen = 500): string {
  const s = String(value ?? "").trim();
  return s.slice(0, maxLen);
}

export function asOptionalString(value: unknown, maxLen = 500): string | null {
  if (value === undefined || value === null) return null;
  const s = asTrimmedString(value, maxLen);
  return s.length ? s : null;
}

export function asOptionalDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function asNumberInRange(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

export function asEnumValue<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T[number]) : null;
}
