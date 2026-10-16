import { describe, expect, it } from 'vitest'
import { formatMoney, minorDigits, toMajorInput, toMinorUnits } from './money'

describe('minorDigits', () => {
  it.each([
    ['USD', 2],
    ['INR', 2],
    ['JPY', 0],
  ])('%s has %i minor digits', (currency, digits) => {
    expect(minorDigits(currency)).toBe(digits)
  })
})

describe('formatMoney', () => {
  it('converts minor units to whole major units', () => {
    expect(formatMoney(6_500_050, 'USD')).toBe('$65,001')
  })

  it('does not divide zero-decimal currencies', () => {
    expect(formatMoney(5_000_000, 'JPY')).toBe('¥5,000,000')
  })
})

describe('toMinorUnits', () => {
  it.each([
    ['65000', 'USD', 6_500_000],
    ['65000.5', 'USD', 6_500_050],
    [' 65000.05 ', 'USD', 6_500_005],
    ['5000000', 'JPY', 5_000_000],
  ])('converts %s %s to %i', (input, currency, expected) => {
    expect(toMinorUnits(input, currency)).toBe(expected)
  })

  it.each([
    ['', 'USD'],
    ['abc', 'USD'],
    ['-100', 'USD'],
    ['1e5', 'USD'],
    ['10.001', 'USD'],
    ['1.5', 'JPY'],
  ])('rejects %j for %s', (input, currency) => {
    expect(toMinorUnits(input, currency)).toBeNull()
  })
})

describe('toMajorInput', () => {
  it('renders minor units as an editable decimal string', () => {
    expect(toMajorInput(6_500_050, 'USD')).toBe('65000.50')
    expect(toMajorInput(5_000_000, 'JPY')).toBe('5000000')
  })
})