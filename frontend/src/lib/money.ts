const LOCALE = 'en-US'

export function minorDigits(currency: string): number {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits ?? 2
}

export function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minorUnits / 10 ** minorDigits(currency))
}

/** Parses a user-typed major amount ("65000.50") into integer minor units without float maths. */
export function toMinorUnits(input: string, currency: string): number | null {
  const digits = minorDigits(currency)
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input.trim())
  if (!match) return null
  const [, whole, fraction = ''] = match
  if (fraction.length > digits) return null
  return Number(whole + fraction.padEnd(digits, '0'))
}

export function toMajorInput(minorUnits: number, currency: string): string {
  const digits = minorDigits(currency)
  return digits === 0 ? String(minorUnits) : (minorUnits / 10 ** digits).toFixed(digits)
}