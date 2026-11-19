import {
  DEFAULT_CURRENCY,
  DEFAULT_COUNTRY_CODE,
  COUNTRY_OPTIONS,
  currencyForCountry,
  normalizeCurrency,
  formatMoney,
  getActiveCurrency,
  getStoredCurrency,
  setActiveCurrency,
} from '@/lib/currency'

describe('currencyForCountry', () => {
  it('maps the supported countries', () => {
    expect(currencyForCountry('GH')).toBe('GHS')
    expect(currencyForCountry('NG')).toBe('NGN')
    expect(currencyForCountry('KE')).toBe('KES')
    expect(currencyForCountry('UG')).toBe('UGX')
    expect(currencyForCountry('TZ')).toBe('TZS')
    expect(currencyForCountry('ZA')).toBe('ZAR')
    expect(currencyForCountry('US')).toBe('USD')
    expect(currencyForCountry('GB')).toBe('GBP')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(currencyForCountry(' ng ')).toBe('NGN')
  })

  it('falls back to GHS for missing or unknown countries', () => {
    expect(currencyForCountry(undefined)).toBe(DEFAULT_CURRENCY)
    expect(currencyForCountry(null)).toBe(DEFAULT_CURRENCY)
    expect(currencyForCountry('')).toBe(DEFAULT_CURRENCY)
    expect(currencyForCountry('XX')).toBe(DEFAULT_CURRENCY)
  })

  it('defaults the country code to Ghana', () => {
    expect(DEFAULT_COUNTRY_CODE).toBe('GH')
  })
})

describe('normalizeCurrency', () => {
  it('accepts a three-letter code in any case', () => {
    expect(normalizeCurrency('ngn')).toBe('NGN')
    expect(normalizeCurrency(' usd ')).toBe('USD')
  })

  it('rejects anything that is not a three-letter code', () => {
    expect(normalizeCurrency('')).toBe(DEFAULT_CURRENCY)
    expect(normalizeCurrency(undefined)).toBe(DEFAULT_CURRENCY)
    expect(normalizeCurrency('DOLLARS')).toBe(DEFAULT_CURRENCY)
    expect(normalizeCurrency('12')).toBe(DEFAULT_CURRENCY)
  })
})

describe('COUNTRY_OPTIONS', () => {
  it('exposes a code, name and currency for every entry', () => {
    for (const option of COUNTRY_OPTIONS) {
      expect(option.code).toMatch(/^[A-Z]{2}$/)
      expect(option.name.length).toBeGreaterThan(0)
      expect(option.currency).toBe(currencyForCountry(option.code))
    }
  })
})

describe('formatMoney', () => {
  afterEach(() => {
    setActiveCurrency(DEFAULT_CURRENCY)
    localStorage.clear()
  })

  it('formats with the active currency using Intl', () => {
    setActiveCurrency('GHS')
    expect(formatMoney(38)).toContain('38.00')
    expect(formatMoney(38)).toContain('GHS')
  })

  it('switches to the currency set for the profile', () => {
    setActiveCurrency('USD')
    expect(formatMoney(38)).toContain('$')
    expect(formatMoney(38)).toContain('38.00')
  })

  it('never hardcodes a symbol - the output follows the active currency', () => {
    setActiveCurrency('NGN')
    const ngn = formatMoney(1000)
    setActiveCurrency('GHS')
    const ghs = formatMoney(1000)
    expect(ngn).not.toBe(ghs)
  })

  it('guards null, undefined and NaN', () => {
    setActiveCurrency('GHS')
    expect(formatMoney(null)).toContain('0.00')
    expect(formatMoney(undefined)).toContain('0.00')
    expect(formatMoney('not a number')).toContain('0.00')
  })

  it('honours an explicit fraction-digits override', () => {
    setActiveCurrency('UGX')
    expect(formatMoney(1234, 0)).not.toContain('.')
  })
})

describe('active currency store', () => {
  afterEach(() => {
    setActiveCurrency(DEFAULT_CURRENCY)
    localStorage.clear()
  })

  it('persists the active currency to localStorage', () => {
    setActiveCurrency('KES')
    expect(localStorage.getItem('active_currency')).toBe('KES')
    expect(getActiveCurrency()).toBe('KES')
    expect(getStoredCurrency()).toBe('KES')
  })

  it('ignores an invalid stored value', () => {
    setActiveCurrency('NOTACODE')
    expect(getActiveCurrency()).toBe(DEFAULT_CURRENCY)
  })
})
