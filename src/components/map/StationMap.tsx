import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { AttributionControl, Layer, Source } from 'react-map-gl/maplibre'
import { useSelector } from '@tanstack/react-store'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'

import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { getFuelStats, useStations } from '#/hooks/use-stations'
import { formatPrice } from '#/lib/format'
import { mapPadding, mapStore } from '#/stores/map'
import { themeStore } from '#/stores/theme'
import { getLocale } from '#/paraglide/runtime'
import type { Bounds } from '#/lib/geo'
import { TIERS } from '#/lib/pricing'
import type { Tier } from '#/lib/pricing'

import {
  INTERACTIVE_LAYERS,
  SOURCE_ID,
  circleLayer,
  labelLayer,
  pillImageId,
  selectedLayer,
  starLayer,
} from './layers'
import { drawPill, readPalette } from './palette'

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

/** Southern Quebec, where nearly every station is. */
const INITIAL_BOUNDS: Bounds = [
  [-79.6, 45.0],
  [-64.2, 49.2],
]

export const MAP_ID = 'main'

// MapLibre resolves its worker relative to its own module, which breaks once
// Vite pre-bundles it; point it at the emitted asset instead.
maplibregl.setWorkerUrl(workerUrl)

interface StationProps {
  id: string
  region: string
  price: number
  label: string
  tier: Tier | -1
  star: boolean
}

export function StationMap() {
  const { stations, byId } = useStations()
  const { fuel, region, station } = useAppSearch()
  const setSearch = useSetSearch()
  const theme = useSelector(themeStore, (s) => s.resolved)
  const locale = getLocale()
  const mapRef = useRef<MapRef | null>(null)
  const clickedRef = useRef<string | undefined>(undefined)
  const [hovering, setHovering] = useState(false)
  // Symbol layers wait for their pill images so no tile is laid out without them.
  const [pillsFor, setPillsFor] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // CSS tokens change with the theme class; re-read them when it flips.
  const palette = useMemo(() => readPalette(), [theme])

  const stats = getFuelStats(stations, fuel)

  const data = useMemo<FeatureCollection<Point, StationProps>>(() => {
    return {
      type: 'FeatureCollection',
      features: stations.map((s) => {
        const price = s.prices[fuel]
        const rank = stats.ranks.get(s.id)
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
          properties: {
            id: s.id,
            region: s.region,
            price: price ?? 9999,
            label: price == null ? '' : formatPrice(price, locale),
            tier: rank?.tier ?? -1,
            star: rank?.regionCheapest ?? false,
          },
        }
      }),
    }
  }, [stations, fuel, stats, locale])

  // Fly to a station picked outside the map (list, nearby card, deep link).
  useEffect(() => {
    const map = mapRef.current
    const target = station ? byId.get(station) : undefined
    if (!loaded || !map || !target || clickedRef.current === station) return
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: Math.max(map.getZoom(), 13),
      padding: mapPadding(),
      duration: 900,
    })
  }, [loaded, station, byId])

  // Frame the chosen region.
  useEffect(() => {
    const map = mapRef.current
    const bounds = region ? stats.byRegion.get(region)?.bounds : undefined
    if (!loaded || !map || !bounds) return
    map.fitBounds(bounds, { padding: mapPadding(), maxZoom: 12, duration: 900 })
    // Re-frame only when the region itself changes, not on fuel switches.
  }, [loaded, region])

  const syncView = (e: { target: MapLibreMap }) => {
    const map = e.target
    const b = map.getBounds()
    mapStore.setState((s) => ({
      ...s,
      bounds: [
        [b.getWest(), b.getSouth()],
        [b.getEast(), b.getNorth()],
      ],
      zoom: map.getZoom(),
    }))
  }

  const onClick = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties.id as string | undefined
    clickedRef.current = id
    setSearch({ station: id })
  }

  const addPills = (map: MapLibreMap) => {
    const current = themeStore.state.resolved
    const colors = readPalette()
    for (const t of TIERS) {
      const id = pillImageId(current, t)
      if (map.hasImage(id)) continue
      const pill = drawPill(t, colors)
      map.addImage(id, pill.data, pill.options)
    }
    setPillsFor(current)
  }

  return (
    <Map
      id={MAP_ID}
      mapLib={maplibregl}
      ref={mapRef}
      initialViewState={{ bounds: INITIAL_BOUNDS }}
      mapStyle={STYLES[theme]}
      style={{ position: 'absolute', inset: 0 }}
      attributionControl={false}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      cursor={hovering ? 'pointer' : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
      onLoad={(e) => {
        addPills(e.target)
        // A theme switch swaps the style, which drops custom images.
        e.target.on('style.load', () => addPills(e.target))
        syncView(e)
        setLoaded(true)
      }}
      onMoveEnd={syncView}
    >
      <AttributionControl compact position="bottom-right" />
      <Source id={SOURCE_ID} type="geojson" data={data}>
        <Layer {...circleLayer(palette, region)} />
        <Layer {...selectedLayer(palette, station)} />
        {pillsFor === theme && <Layer {...labelLayer(palette, theme, region)} />}
        {pillsFor === theme && <Layer {...starLayer(theme, region)} />}
      </Source>
    </Map>
  )
}
