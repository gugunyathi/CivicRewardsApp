/**
 * Normalize South African mobile numbers to E.164 (+27XXXXXXXXX).
 * Accepts formats such as:
 *   082 123 4567
 *   +27 82 123 4567
 *   27821234567
 *   821234567
 */
export function normalizeSaMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let e164 = '';
  if (digits.length === 11 && digits.startsWith('27')) {
    e164 = `+${digits}`;
  } else if (digits.length === 10 && digits.startsWith('0')) {
    e164 = `+27${digits.slice(1)}`;
  } else if (digits.length === 9 && /^[6-8]/.test(digits)) {
    e164 = `+27${digits}`;
  } else {
    return null;
  }
  return /^\+27\d{9}$/.test(e164) ? e164 : null;
}

export function formatSaMobileDisplay(input: string): string {
  const norm = normalizeSaMobile(input);
  if (!norm) return input.trim();
  // +27821234567 -> +27 82 123 4567
  const local = norm.slice(3);
  return `+27 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}
