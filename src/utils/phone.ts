/** E.164 max length (country + national number). */
const E164_MAX_DIGITS = 15;

/**
 * Normalize phone for storage: digits only, optional leading +, max 15 digits.
 * Returns trimmed string; if result has digits, prepend + for E.164 style.
 */
export function normalizePhone(input: string | undefined | null): string {
  if (input == null) return '';
  const trimmed = String(input).trim();
  if (trimmed === '') return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return trimmed;
  const limited = digits.slice(0, E164_MAX_DIGITS);
  return limited.length > 0 ? `+${limited}` : trimmed;
}

/** Validate: after normalization, has 8–15 digits (allows local or international). */
export function isValidPhone(input: string | undefined | null): boolean {
  const normalized = normalizePhone(input);
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= E164_MAX_DIGITS;
}
