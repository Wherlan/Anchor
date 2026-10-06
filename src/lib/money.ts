/**
 * Convert a dollar amount to whole cents. Returns null when the amount is not a
 * finite number or rounds to less than one cent (e.g. 0.001 -> 0 cents).
 */
export function toCents(amount: number): number | null {
  if (!Number.isFinite(amount)) return null
  const cents = Math.round(amount * 100)
  return cents >= 1 ? cents : null
}

export function centsToDollars(cents: number): number {
  return cents / 100
}
