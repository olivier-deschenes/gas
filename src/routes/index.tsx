import { useEffect } from 'react'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { MapProvider } from 'react-map-gl/maplibre'
import { IconRefresh } from '@tabler/icons-react'
import { z } from 'zod'

import { AppHeader, Logo } from '#/components/AppHeader'
import { MapChrome } from '#/components/MapChrome'
import { Panel } from '#/components/Panel'
import { StationMap } from '#/components/map/StationMap'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { parseLatLng } from '#/lib/geo'
import { FUELS } from '#/lib/stations'
import { stationsQueryOptions } from '#/lib/stations.query'
import { cn } from '#/lib/utils'
import { useTripStart } from '#/hooks/use-trip'
import { useWakeLock } from '#/hooks/use-wake-lock'
import { initLocation, locationStore } from '#/stores/location'
import { mapStore } from '#/stores/map'
import { initTrip } from '#/stores/trip'
import { m } from '#/paraglide/messages'

const searchDefaults = {
  fuel: 'regular',
  view: 'map',
  tab: 'stations',
} as const

const latLng = z
  .string()
  .refine((value) => parseLatLng(value) != null)
  .optional()
  .catch(undefined)
// Search values are JSON-parsed first, so a name like "2020" arrives as a number.
const placeName = z.coerce.string().max(120).optional().catch(undefined)

const searchSchema = z.object({
  fuel: z.enum(FUELS).default(searchDefaults.fuel).catch(searchDefaults.fuel),
  view: z
    .enum(['map', 'list'])
    .default(searchDefaults.view)
    .catch(searchDefaults.view),
  tab: z
    .enum(['stations', 'trip', 'regions'])
    .default(searchDefaults.tab)
    .catch(searchDefaults.tab),
  region: z.string().optional().catch(undefined),
  station: z.string().optional().catch(undefined),
  /** Trip destination as "lat,lng", with its display name. */
  to: latLng,
  toName: placeName,
  /** Trip start; absent means "my location". */
  from: latLng,
  fromName: placeName,
})

export type AppSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  // Map, geolocation and storage are browser-only.
  ssr: false,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(stationsQueryOptions),
  pendingComponent: LoadingScreen,
  errorComponent: ErrorScreen,
  component: App,
})

function App() {
  const { view } = Route.useSearch()
  const insetBottom = useSelector(mapStore, (s) => s.insets.bottom)
  const driving = useSelector(locationStore, (s) => s.driving)
  useWakeLock(driving)
  useTripStart()
  useEffect(() => {
    initTrip()
    void initLocation()
  }, [])

  return (
    <MapProvider>
      <div className="relative flex h-dvh w-full overflow-hidden">
        <aside
          className={cn(
            'absolute inset-0 z-20 flex-col bg-background lg:static lg:z-auto lg:w-[400px] lg:shrink-0 lg:border-r',
            view === 'list' ? 'flex' : 'hidden lg:flex',
          )}
        >
          <AppHeader className="border-b p-3 pt-[max(env(safe-area-inset-top),0.75rem)]" />
          <Panel />
        </aside>
        <main
          className="relative min-w-0 flex-1"
          style={
            { '--inset-bottom': `${insetBottom}px` } as React.CSSProperties
          }
        >
          <StationMap />
          <MapChrome />
        </main>
      </div>
    </MapProvider>
  )
}

/** Mirrors the real layout (sidebar, map, floating chrome) so nothing jumps on load. */
function LoadingScreen() {
  return (
    <div
      className="relative flex h-dvh w-full overflow-hidden"
      aria-busy="true"
    >
      <aside className="hidden w-[400px] shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex flex-col gap-2 border-b p-3">
          <div className="flex h-8 items-center gap-2">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">
              {m.app_name()}
            </span>
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex h-9 items-center gap-4 border-b px-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 10 }, (_, i) => (
            <RowSkeleton key={i} className="px-3" />
          ))}
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 bg-muted/60">
        <div className="absolute inset-0 flex flex-col p-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:p-4">
          <div className="flex flex-col items-start gap-2 lg:hidden">
            <div className="flex h-12 w-full items-center gap-3 border bg-background px-3 shadow-lg shadow-black/10">
              <Logo />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-56 border bg-background shadow-md shadow-black/10" />
          </div>

          <div className="mt-auto mb-2 size-11 self-end border bg-background shadow-lg" />

          <div className="w-full border bg-background pb-2 shadow-xl shadow-black/10 lg:absolute lg:top-4 lg:right-4 lg:w-96">
            <div className="flex h-5 items-end justify-center lg:hidden">
              <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
            </div>
            <div className="flex items-center gap-2 px-4 pt-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-8 w-24" />
            </div>
            <RowSkeleton className="px-4" />
          </div>
        </div>
      </main>
    </div>
  )
}

function RowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-2.5', className)}>
      <Skeleton className="h-9 w-1" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-5 w-14" />
    </div>
  )
}

function ErrorScreen({ reset }: { reset: () => void }) {
  return (
    <div className="grid h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm">{m.error_loading()}</p>
        <Button variant="outline" onClick={reset}>
          <IconRefresh />
          {m.retry()}
        </Button>
      </div>
    </div>
  )
}
