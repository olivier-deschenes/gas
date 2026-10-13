import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl'
import type { MapPalette } from './palette'

export const SOURCE_ID = 'stations'
export const ROUTE_SOURCE_ID = 'route'
export const INTERACTIVE_LAYERS = ['stations-circle', 'stations-label', 'stations-star']

const FONT = ['Noto Sans Bold']
/** Labels take over from bare dots from this zoom. */
export const LABEL_MINZOOM = 10

type Circle = Omit<CircleLayerSpecification, 'source'>
type Symbol = Omit<SymbolLayerSpecification, 'source'>
type Line = Omit<LineLayerSpecification, 'source'>

const tier = ['get', 'tier'] as ExpressionSpecification
const priced = ['>=', tier, 0] as ExpressionSpecification
/** Stations outside the chosen region or trip corridor are faded. */
const focused = ['!', ['get', 'dim']] as ExpressionSpecification

export function pillImageId(theme: string, t: number) {
  return `pill-${theme}-${t}`
}

export function circleLayer(p: MapPalette): Circle {
  return {
    id: 'stations-circle',
    type: 'circle',
    layout: {
      // Cheaper tiers draw on top of pricier ones.
      'circle-sort-key': ['case', priced, ['-', 10, tier], 0],
    },
    paint: {
      'circle-color': [
        'match',
        tier,
        0,
        p.tiers[0],
        1,
        p.tiers[1],
        2,
        p.tiers[2],
        3,
        p.tiers[3],
        4,
        p.tiers[4],
        p.none,
      ],
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        ['case', priced, ['case', ['==', tier, 0], 3.5, 2.5], 1.5],
        9,
        ['case', priced, 5, 3],
        13,
        ['case', priced, 7, 4],
      ],
      'circle-stroke-color': p.halo,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 10, 1.5],
      'circle-opacity': ['case', focused, 1, 0.18],
      'circle-stroke-opacity': ['case', focused, 1, 0.18],
    },
  }
}

export function labelLayer(p: MapPalette, theme: string): Symbol {
  return {
    id: 'stations-label',
    type: 'symbol',
    minzoom: LABEL_MINZOOM,
    filter: ['all', priced, ['!', ['get', 'star']], focused],
    layout: {
      'text-field': ['get', 'label'],
      'text-font': FONT,
      'text-size': 12,
      'text-anchor': 'bottom',
      'text-offset': [0, -0.9],
      'icon-image': ['concat', `pill-${theme}-`, ['to-string', tier]],
      'icon-text-fit': 'both',
      'icon-text-fit-padding': [1, 4, 0, 4],
      // Lower price = placed first, so the cheapest labels survive collisions.
      'symbol-sort-key': ['get', 'price'],
      'symbol-z-order': 'source',
    },
    paint: {
      'text-color': ['case', ['==', tier, 0], '#ffffff', p.text],
    },
  }
}

export function starLayer(theme: string): Symbol {
  return {
    id: 'stations-star',
    type: 'symbol',
    filter: ['all', ['get', 'star'], focused],
    layout: {
      'text-field': ['concat', '★ ', ['get', 'label']],
      'text-font': FONT,
      'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 10, 12],
      'text-anchor': 'bottom',
      'text-offset': [0, -0.9],
      'icon-image': pillImageId(theme, 0),
      'icon-text-fit': 'both',
      'icon-text-fit-padding': [1, 4, 0, 4],
      'symbol-sort-key': ['get', 'price'],
      'symbol-z-order': 'source',
    },
    paint: { 'text-color': '#ffffff' },
  }
}

export function selectedLayer(p: MapPalette, id: string | undefined): Circle {
  return {
    id: 'stations-selected',
    type: 'circle',
    filter: ['==', ['get', 'id'], id ?? ''],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 13, 13],
      'circle-color': 'transparent',
      'circle-stroke-color': p.user,
      'circle-stroke-width': 3,
    },
  }
}

const routeWidth = (extra: number): ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  3 + extra,
  10,
  4.5 + extra,
  15,
  7 + extra,
]

/** Route casing then line, drawn under the stations. */
export function routeLayers(p: MapPalette): [Line, Line] {
  const layout = { 'line-join': 'round', 'line-cap': 'round' } as const
  return [
    {
      id: 'route-casing',
      type: 'line',
      layout,
      paint: { 'line-color': p.halo, 'line-width': routeWidth(3) },
    },
    {
      id: 'route-line',
      type: 'line',
      layout,
      paint: { 'line-color': p.user, 'line-width': routeWidth(0), 'line-opacity': 0.85 },
    },
  ]
}
