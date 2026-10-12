import { createStore } from '@tanstack/react-store'
import type { Bounds } from '#/lib/geo'

export const mapStore = createStore<{
  /** Visible map area, updated on move end; drives "cheapest in view". */
  bounds: Bounds | null
  zoom: number
  /** Space covered by floating chrome, in px, so camera moves avoid it. */
  insets: { top: number; bottom: number }
}>({
  bounds: null,
  zoom: 0,
  insets: { top: 0, bottom: 0 },
})

export function mapPadding() {
  const { top, bottom } = mapStore.state.insets
  return { top: top + 24, bottom: bottom + 24, left: 32, right: 32 }
}
