import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from '@tanstack/react-store'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equals,
  globalFilteringFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { rankItem, rankings } from '@tanstack/match-sorter-utils'
import { IconSearch } from '@tabler/icons-react'
import type { ColumnFiltersState, FilterFn, SortingState } from '@tanstack/react-table'

import { StationRow } from '#/components/StationRow'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useFuelStats, useStations } from '#/hooks/use-stations'
import { distanceKm } from '#/lib/geo'
import { stationTitle, stationsCount } from '#/lib/i18n'
import { locateOnce, locationStore } from '#/stores/location'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { Station } from '#/lib/stations'

interface ListRow {
  station: Station
  /** undefined (not null) so `sortUndefined: 'last'` keeps unpriced rows at the end. */
  price: number | undefined
  distance: number | undefined
  region: string
  search: string
}

/** Every word must appear somewhere, ignoring case and accents. */
const allWords: FilterFn<any, any> = (row, columnId, value: string) => {
  const haystack = String(row.getValue(columnId))
  return value
    .trim()
    .split(/\s+/)
    .every((word) => rankItem(haystack, word, { threshold: rankings.CONTAINS }).passed)
}

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { equals: filterFn_equals, allWords },
})

const helper = createColumnHelper<typeof features, ListRow>()
const columns = helper.columns([
  helper.accessor('price', { sortUndefined: 'last', enableGlobalFilter: false }),
  helper.accessor('distance', { sortUndefined: 'last', enableGlobalFilter: false }),
  helper.accessor('region', { filterFn: 'equals', enableGlobalFilter: false }),
  helper.accessor('search', { enableGlobalFilter: true }),
])

type SortKey = 'price' | 'distance'

const SORTS: Record<SortKey, SortingState> = {
  price: [
    { id: 'price', desc: false },
    { id: 'distance', desc: false },
  ],
  distance: [
    { id: 'distance', desc: false },
    { id: 'price', desc: false },
  ],
}

const ALL = '__all'
const ROW_HEIGHT = 61

export function StationList() {
  // Table reads go through builder methods on a stable instance; opt this
  // component out of compiler memoization so the row model stays live.
  'use no memo'
  const { stations } = useStations()
  const { fuel, region, station: selected, view } = useAppSearch()
  const setSearch = useSetSearch()
  const stats = useFuelStats(fuel)
  const fix = useSelector(locationStore, (s) => s.fix)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('price')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Phones reach this list from the map's search bar: start typing right away.
  useEffect(() => {
    if (view === 'list') inputRef.current?.focus()
  }, [view])

  const data = useMemo<Array<ListRow>>(
    () =>
      stations.map((s) => ({
        station: s,
        price: s.prices[fuel] ?? undefined,
        distance: fix ? distanceKm(fix, s) : undefined,
        region: s.region,
        search: `${stationTitle(s)} ${s.name} ${s.address} ${s.postalCode}`,
      })),
    [stations, fuel, fix],
  )

  const columnFilters = useMemo<ColumnFiltersState>(
    () => (region ? [{ id: 'region', value: region }] : []),
    [region],
  )

  const effectiveSort: SortKey = sort === 'distance' && fix ? 'distance' : 'price'
  const table = useTable({
    features,
    columns,
    data,
    state: { sorting: SORTS[effectiveSort], globalFilter: query, columnFilters },
    globalFilterFn: 'allWords',
    getRowId: (row) => row.station.id,
  })
  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index].id,
    overscan: 8,
  })

  const regionNames = [...stats.byRegion.keys()].sort((a, b) => a.localeCompare(b, getLocale()))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={m.search_placeholder()}
            aria-label={m.search_placeholder()}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={effectiveSort}
            aria-label={m.sort_label()}
            onValueChange={async (value) => {
              if (!value) return
              if (value === 'distance' && !fix && !(await locateOnce())) return
              setSort(value as SortKey)
            }}
          >
            <ToggleGroupItem value="price" className="h-8 px-3">
              {m.sort_price()}
            </ToggleGroupItem>
            <ToggleGroupItem value="distance" className="h-8 px-3">
              {m.sort_distance()}
            </ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={region ?? ALL}
            onValueChange={(value) => setSearch({ region: value === ALL ? undefined : value })}
          >
            <SelectTrigger size="sm" className="h-8 min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectItem value={ALL}>{m.all_regions()}</SelectItem>
              {regionNames.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {stationsCount(rows.length)}
        </p>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{m.no_results()}</p>
        ) : (
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index].original
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute inset-x-0 top-0 border-b"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <StationRow
                    station={row.station}
                    price={row.price ?? null}
                    tier={stats.ranks.get(row.station.id)?.tier ?? -1}
                    star={stats.ranks.get(row.station.id)?.regionCheapest}
                    distanceKm={row.distance ?? null}
                    onSelect={(id) => setSearch({ station: id, view: 'map' })}
                    className={row.station.id === selected ? 'bg-muted' : undefined}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
