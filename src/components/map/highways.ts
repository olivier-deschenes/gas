import type { Map as MapLibreMap } from 'maplibre-gl'
import { INTERACTIVE_LAYERS } from './layers'

const LINE_LAYERS = {
  inner: ['highway_motorway_inner', 'highway_motorway_bridge_inner', 'tunnel_motorway_inner'],
  casing: ['highway_motorway_casing', 'highway_motorway_bridge_casing', 'tunnel_motorway_casing'],
  subtle: ['highway_motorway_subtle'],
}

/** Base-style labels that would print the same numbers next to our shields. */
const REF_LAYERS = ['highway_name_motorway', 'highway-shield-non-us']

const SHIELD_LAYER = 'highway-shield'
const SHIELD_IMAGE = 'autoroute-shield'

/**
 * The base styles mute motorways to near-invisible and barely number them;
 * lift the lines and mark each autoroute with its shield so routes read at a glance.
 * Must rerun after every style swap, which drops paint overrides, images and layers.
 */
export function styleHighways(map: MapLibreMap) {
  const css = getComputedStyle(document.documentElement)
  const colors = {
    inner: css.getPropertyValue('--map-highway').trim(),
    casing: css.getPropertyValue('--map-highway-casing').trim(),
    subtle: css.getPropertyValue('--map-highway-far').trim(),
  }
  for (const [kind, ids] of Object.entries(LINE_LAYERS)) {
    for (const id of ids) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', colors[kind as keyof typeof colors])
    }
  }
  for (const id of REF_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
  }

  if (!map.hasImage(SHIELD_IMAGE)) {
    const shield = drawShield()
    map.addImage(SHIELD_IMAGE, shield.data, shield.options)
  }
  if (map.getLayer(SHIELD_LAYER)) return
  // Under the station layers when they're already up; otherwise they land on top later.
  const before = INTERACTIVE_LAYERS.find((id) => map.getLayer(id))
  map.addLayer(
    {
      id: SHIELD_LAYER,
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 6,
      filter: [
        'all',
        ['==', ['get', 'class'], 'motorway'],
        ['match', ['get', 'network'], ['ca-provincial-arterial', 'ca-transcanada'], true, false],
        ['<=', ['get', 'ref_length'], 4],
      ],
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 280,
        'text-field': ['get', 'ref'],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 12],
        'text-rotation-alignment': 'viewport',
        'icon-rotation-alignment': 'viewport',
        'icon-image': SHIELD_IMAGE,
        'icon-text-fit': 'both',
        'icon-text-fit-padding': [1, 4, 1, 4],
      },
      paint: { 'text-color': '#ffffff' },
    },
    before,
  )
}

/** Québec autoroute shield: red crown over a blue body, white edge so it holds on any basemap. */
function drawShield(pixelRatio = 2) {
  const u = pixelRatio
  const w = 16 * u
  const h = 18 * u
  const band = 4 * u
  const r = 3 * u
  const edge = 1.5 * u
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.roundRect(edge / 2, edge / 2, w - edge, h - edge, r)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(edge, edge, w - edge * 2, h - edge * 2, r - edge / 2)
  ctx.clip()
  ctx.fillStyle = '#1b4f9e'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#d7282f'
  ctx.fillRect(0, 0, w, edge + band)
  ctx.restore()
  return {
    data: ctx.getImageData(0, 0, w, h),
    options: {
      pixelRatio,
      // Stretch only the blue body so the crown keeps its height.
      stretchX: [[r, w - r]] as Array<[number, number]>,
      stretchY: [[edge + band + u, h - r]] as Array<[number, number]>,
      content: [r, edge + band, w - r, h - edge] as [number, number, number, number],
    },
  }
}
