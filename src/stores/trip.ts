import { createStore } from '@tanstack/react-store'
import type { LngLat } from '#/lib/geo'

/** How far from the route a station may be, in km (straight line). */
export const CORRIDORS_KM = [1, 2, 5] as const
export type CorridorKm = (typeof CORRIDORS_KM)[number]
export const MAX_CORRIDOR_KM = CORRIDORS_KM[CORRIDORS_KM.length - 1]

interface TripState {
  corridorKm: CorridorKm
  /**
   * Where a trip from "my location" starts. Captured once rather than
   * following the live fix, so driving doesn't keep re-fetching the route,
   * and kept out of the URL so shared links don't carry it.
   */
  start: LngLat | null
}

const CORRIDOR_KEY = 'plein:corridor'

export const tripStore = createStore<TripState>({ corridorKm: 2, start: null })

export function setCorridor(corridorKm: CorridorKm) {
  try {
    localStorage.setItem(CORRIDOR_KEY, String(corridorKm))
  } catch {
    // Ignore blocked storage.
  }
  tripStore.setState((s) => ({ ...s, corridorKm }))
}

export function setTripStart(start: LngLat | null) {
  tripStore.setState((s) => ({
    ...s,
    start: start && { lng: start.lng, lat: start.lat },
  }))
}

export function initTrip() {
  try {
    const value = Number(localStorage.getItem(CORRIDOR_KEY))
    if ((CORRIDORS_KM as ReadonlyArray<number>).includes(value)) {
      tripStore.setState((s) => ({ ...s, corridorKm: value as CorridorKm }))
    }
  } catch {
    // Ignore blocked storage.
  }
}
