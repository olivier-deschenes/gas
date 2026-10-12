import { useEffect, useRef } from 'react'
import { IconX } from '@tabler/icons-react'
import { AppHeader } from '#/components/AppHeader'
import { NearbyCard } from '#/components/NearbyCard'
import { StationDetail } from '#/components/StationDetail'
import { Button } from '#/components/ui/button'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
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
      mapStore.setState((s) => ({ ...s, insets: { ...s.insets, [edge]: Math.max(0, value) } }))
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
  const headerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  useInset(headerRef, 'top')
  useInset(sheetRef, 'bottom')

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col p-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:p-4"
    >
      <div ref={headerRef} className="pointer-events-auto flex flex-col gap-2 lg:hidden">
        <AppHeader className="glass border p-2.5 shadow-lg shadow-black/5" />
      </div>

      {region && (
        <div className="pointer-events-auto mt-2 self-start">
          <Button
            variant="outline"
            size="sm"
            className="glass h-8 shadow-sm"
            onClick={() => setSearch({ region: undefined })}
          >
            {region}
            <IconX data-icon="inline-end" />
            <span className="sr-only">{m.whole_province()}</span>
          </Button>
        </div>
      )}

      <div
        ref={sheetRef}
        className="pointer-events-auto mt-auto w-full border bg-background shadow-xl shadow-black/10 lg:max-w-sm"
      >
        {station ? <StationDetail id={station} /> : <NearbyCard />}
      </div>
    </div>
  )
}
