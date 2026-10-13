import type { LngLat } from './geo'

export const NAV_APPS = ['apple', 'google', 'waze'] as const
export type NavApp = (typeof NAV_APPS)[number]

export function navAppLabel(app: NavApp, locale: string) {
  if (app === 'apple') return locale.startsWith('fr') ? 'Plans' : 'Apple Maps'
  return app === 'google' ? 'Google Maps' : 'Waze'
}

/** Apps whose links take a stop before the destination; Waze's don't. */
export function supportsStops(app: NavApp) {
  return app !== 'waze'
}

/**
 * Directions to `to`, or, on a trip, through `to` on the way to `then`
 * (Apple's unified Maps URLs need iOS 18.4 / macOS 15.4).
 */
export function directionsUrl(app: NavApp, { lat, lng }: LngLat, then?: LngLat) {
  if (then && supportsStops(app)) {
    const stop = `${lat},${lng}`
    const end = `${then.lat},${then.lng}`
    return app === 'apple'
      ? `https://maps.apple.com/directions?destination=${end}&waypoint=${stop}&mode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${end}&waypoints=${stop}&travelmode=driving`
  }
  switch (app) {
    case 'apple':
      return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    case 'waze':
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  }
}

const STORAGE_KEY = 'plein:nav-app'

export function preferredNavApp(): NavApp {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (NAV_APPS as ReadonlyArray<string>).includes(stored)) return stored as NavApp
  } catch {
    // Ignore blocked storage.
  }
  return /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'apple' : 'google'
}

export function rememberNavApp(app: NavApp) {
  try {
    localStorage.setItem(STORAGE_KEY, app)
  } catch {
    // Ignore blocked storage.
  }
}
