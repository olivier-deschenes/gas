const priceFormats = new Map<string, Intl.NumberFormat>()

/** 189.9 → "189,9" (fr) / "189.9" (en). Prices are cents per litre. */
export function formatPrice(cents: number, locale: string) {
  let f = priceFormats.get(locale)
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
    priceFormats.set(locale, f)
  }
  return f.format(cents)
}

/** Unsigned cents with unit, e.g. "6,0 ¢" / "6.0¢". */
export function formatCents(cents: number, locale: string) {
  const value = formatPrice(Math.abs(cents), locale)
  return locale.startsWith('fr') ? `${value} ¢` : `${value}¢`
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

export function formatRelative(date: Date, locale: string, now = Date.now()) {
  const diff = date.getTime() - now
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      return rtf.format(Math.round(diff / ms), unit)
    }
  }
  return rtf.format(0, 'minute')
}

/** 205 → "3 h 25" (fr) / "3 h 25 min" (en); under an hour, "45 min". */
export function formatDuration(minutes: number, locale: string) {
  const total = Math.max(1, Math.round(minutes))
  const h = Math.floor(total / 60)
  const min = total % 60
  if (h === 0) return `${min} min`
  if (locale.startsWith('fr')) return `${h} h ${String(min).padStart(2, '0')}`
  return min ? `${h} h ${min} min` : `${h} h`
}
