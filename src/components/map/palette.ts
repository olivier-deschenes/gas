import type { Tier } from '#/lib/pricing'
import type { Map as MapLibreMap } from 'maplibre-gl'

export interface MapPalette {
  tiers: Record<Tier, string>
  none: string
  halo: string
  text: string
  user: string
}

/** Read the theme's CSS tokens so the map and the UI share one palette. */
export function readPalette(): MapPalette {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    tiers: {
      0: v('--tier-0'),
      1: v('--tier-1'),
      2: v('--tier-2'),
      3: v('--tier-3'),
      4: v('--tier-4'),
    },
    none: v('--tier-none'),
    halo: v('--map-halo'),
    text: v('--map-text'),
    user: v('--user'),
  }
}

const PILL_RADIUS = 5

/**
 * Stretchable rounded "price pill" used behind labels with icon-text-fit.
 * The cheapest tier is filled; the others are outlined in their tier colour.
 */
export function drawPill(tier: Tier, palette: MapPalette, pixelRatio = 2) {
  const r = PILL_RADIUS * pixelRatio
  const size = r * 2 + 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const line = 1.5 * pixelRatio
  ctx.beginPath()
  ctx.roundRect(line / 2, line / 2, size - line, size - line, r - line / 2)
  ctx.fillStyle = tier === 0 ? palette.tiers[0] : palette.halo
  ctx.fill()
  ctx.lineWidth = line
  ctx.strokeStyle = palette.tiers[tier]
  ctx.stroke()
  return {
    data: ctx.getImageData(0, 0, size, size),
    options: {
      pixelRatio,
      stretchX: [[r, size - r]] as Array<[number, number]>,
      stretchY: [[r, size - r]] as Array<[number, number]>,
      // Text may sit over the corners; icon-text-fit padding keeps it clear.
      content: [r / 2, r / 2, size - r / 2, size - r / 2] as [number, number, number, number],
    },
  }
}

const HIGHWAY_LAYERS = {
  inner: ['highway_motorway_inner', 'highway_motorway_bridge_inner', 'tunnel_motorway_inner'],
  casing: ['highway_motorway_casing', 'highway_motorway_bridge_casing', 'tunnel_motorway_casing'],
  subtle: ['highway_motorway_subtle'],
}

/** The base styles mute motorways to near-invisible; lift them so routes read at a glance. */
export function brightenHighways(map: MapLibreMap) {
  const css = getComputedStyle(document.documentElement)
  const colors = {
    inner: css.getPropertyValue('--map-highway').trim(),
    casing: css.getPropertyValue('--map-highway-casing').trim(),
    subtle: css.getPropertyValue('--map-highway-far').trim(),
  }
  for (const [kind, ids] of Object.entries(HIGHWAY_LAYERS)) {
    for (const id of ids) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', colors[kind as keyof typeof colors])
    }
  }
}
