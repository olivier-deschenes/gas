import { useEffect, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { FuelToggle } from '#/components/FuelToggle'
import { LocateButton } from '#/components/LocateButton'
import { MapSearchBar } from '#/components/MapSearchBar'
import { NearbyCard } from '#/components/NearbyCard'
import { StationDetail } from '#/components/StationDetail'
import { Button } from '#/components/ui/button'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useGeoErrorToasts } from '#/hooks/use-geo-error-toasts'
import { cn } from '#/lib/utils'
import { mapStore } from '#/stores/map'
import { m } from '#/paraglide/messages'

/** Report how much of the map a floating element covers (0 when hidden). */
function useInset(ref: React.RefObject<HTMLElement | null>, edge: 'top' | 'bottom') {
  useEffect(() => {
    const el = ref.current
    const parent = el?.offsetParent ?? el?.parentElement
    if (!el || !parent) return
    const update = () => {
      const r = el.getBoundingClientRect()
      const p = parent.getBoundingClientRect()
      // On wide screens the sheet is a corner card, not a band across the map.
      const wide = edge === 'bottom' && matchMedia('(min-width: 1024px)').matches
      const visible = !wide && el.offsetParent !== null && r.height > 0
      const value = !visible ? 0 : edge === 'top' ? r.bottom - p.top : p.bottom - r.top
      mapStore.setState((s) => ({
        ...s,
        insets: { ...s.insets, [edge]: Math.max(0, value) },
      }))
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [ref, edge])
}

export function MapChrome() {
  const { station, region } = useAppSearch()
  const setSearch = useSetSearch()
  const [expanded, setExpanded] = useState(false)
  const swipe = useSheetSwipe(setExpanded)
  const headerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  useInset(headerRef, 'top')
  useInset(sheetRef, 'bottom')
  useGeoErrorToasts()

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:p-4">
      <div ref={headerRef} className="flex flex-col items-start gap-2 lg:hidden">
        <MapSearchBar className="pointer-events-auto w-full" />
        <div className="pointer-events-auto flex max-w-full items-center gap-2">
          <FuelToggle
            className="w-auto shadow-md shadow-black/10"
            itemClassName="h-8 flex-none px-3 data-[state=off]:bg-background"
          />
          {region && (
            <RegionChip region={region} onClear={() => setSearch({ region: undefined })} />
          )}
        </div>
      </div>

      {region && (
        <div className="pointer-events-auto hidden self-start lg:block">
          <RegionChip region={region} onClear={() => setSearch({ region: undefined })} />
        </div>
      )}

      <div className="pointer-events-auto mt-auto mb-2 self-end">
        <LocateButton />
      </div>

      <div
        ref={sheetRef}
        className={cn(
          'pointer-events-auto w-full border bg-background shadow-xl shadow-black/10 lg:absolute lg:top-4 lg:right-4 lg:w-96',
          !station && 'max-lg:touch-none',
        )}
        {...(station ? {} : swipe)}
      >
        {station ? (
          <StationDetail id={station} />
        ) : (
          <>
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? m.sheet_collapse() : m.sheet_expand()}
              className="flex h-5 w-full items-end justify-center outline-none lg:hidden"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
            </button>
            <NearbyCard collapsed={!expanded} />
          </>
        )}
      </div>
    </div>
  )
}

function RegionChip({ region, onClear }: { region: string; onClear: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 min-w-0 bg-background shadow-md shadow-black/10 dark:bg-background"
      onClick={onClear}
    >
      <span className="truncate">{region}</span>
      <IconX data-icon="inline-end" />
      <span className="sr-only">{m.whole_province()}</span>
    </Button>
  )
}

/** Swipe up/down anywhere on the phone sheet to expand or collapse it. */
function useSheetSwipe(onChange: (expanded: boolean) => void) {
  const startY = useRef<number | null>(null)
  const swiped = useRef(false)
  return {
    onPointerDown: (e: React.PointerEvent) => {
      startY.current = e.clientY
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (startY.current == null) return
      const dy = e.clientY - startY.current
      startY.current = null
      swiped.current = Math.abs(dy) > 24
      if (swiped.current) onChange(dy < 0)
    },
    // A swipe that ends on a station row must not also select it.
    onClickCapture: (e: React.MouseEvent) => {
      if (swiped.current) e.stopPropagation()
      swiped.current = false
    },
    onPointerCancel: () => {
      startY.current = null
    },
  }
}
