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
