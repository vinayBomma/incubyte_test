export const COUNTRY_CURRENCY = {
  Australia: 'AUD',
  Brazil: 'BRL',
  Canada: 'CAD',
  France: 'EUR',
  Germany: 'EUR',
  India: 'INR',
  Japan: 'JPY',
  Singapore: 'SGD',
  'United Kingdom': 'GBP',
  'United States': 'USD',
} as const

export type Country = keyof typeof COUNTRY_CURRENCY
export type Currency = (typeof COUNTRY_CURRENCY)[Country]

// ISO 4217 minor-unit digits; of the supported currencies only JPY has no subunit.
const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set(['JPY'])

export function isSupportedCountry(name: string): name is Country {
  return Object.hasOwn(COUNTRY_CURRENCY, name)
}

export function minorDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2
}

export function toMinorUnits(majorUnits: number, currency: string): number {
  return majorUnits * 10 ** minorDigits(currency)
}
