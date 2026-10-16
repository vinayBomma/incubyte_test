import { describe, expect, it } from 'vitest'
import { COUNTRY_CURRENCY, isSupportedCountry, minorDigits, toMinorUnits } from './countries'

describe('countries', () => {
  it('maps each supported country to its ISO currency', () => {
    expect(COUNTRY_CURRENCY.India).toBe('INR')
    expect(COUNTRY_CURRENCY.Germany).toBe('EUR')
    expect(Object.keys(COUNTRY_CURRENCY)).toHaveLength(10)
  })

  it('recognises only supported countries', () => {
    expect(isSupportedCountry('Japan')).toBe(true)
    expect(isSupportedCountry('Atlantis')).toBe(false)
    expect(isSupportedCountry('toString')).toBe(false)
  })

  it('uses 0 minor digits for JPY and 2 for other currencies', () => {
    expect(minorDigits('JPY')).toBe(0)
    expect(minorDigits('USD')).toBe(2)
  })

  it('converts whole major units to integer minor units', () => {
    expect(toMinorUnits(65_000, 'USD')).toBe(6_500_000)
    expect(toMinorUnits(9_000_000, 'JPY')).toBe(9_000_000)
  })
})
