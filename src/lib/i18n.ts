import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { Fuel, Station } from './stations'

export function fuelLabel(fuel: Fuel) {
  switch (fuel) {
    case 'regular':
      return m.fuel_regular()
    case 'super':
      return m.fuel_super()
    case 'diesel':
      return m.fuel_diesel()
  }
}

/** Brand reads better than numbered-company names ("9196-9261 Québec inc."). */
export function stationTitle(s: Station) {
  return s.brand ?? s.name
}

export function stationSubtitle(s: Station) {
  return s.brand && s.name !== s.brand ? s.name : null
}

/** "1 station" / "2 462 stations", with locale plural rules and grouping. */
export function stationsCount(count: number) {
  const locale = getLocale()
  const formatted = new Intl.NumberFormat(locale).format(count)
  return new Intl.PluralRules(locale).select(count) === 'one'
    ? m.stations_count_one({ count: formatted })
    : m.stations_count({ count: formatted })
}
