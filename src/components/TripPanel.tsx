import { useState } from 'react'
import { IconCircleDot, IconMapPinFilled, IconX } from '@tabler/icons-react'
import { PlaceField } from '#/components/PlaceField'
import {
  CorridorToggle,
  TripStatus,
  TripStopRow,
  corridorSummary,
  routeSummary,
} from '#/components/TripParts'
import { Button } from '#/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useTrip, useTripActions } from '#/hooks/use-trip'
import { m } from '#/paraglide/messages'

type SortKey = 'price' | 'along'

/** Trip tab: pick where you're going, then every station along the way. */
export function TripPanel() {
  const trip = useTrip()
  const actions = useTripActions()
  const { station: selected, view } = useAppSearch()
  const setSearch = useSetSearch()
  const [sort, setSort] = useState<SortKey>('price')
  const [focusFrom, setFocusFrom] = useState(false)
  const { along } = trip

  const stops = along
    ? sort === 'price'
      ? along.candidates
      : [...along.candidates].sort((a, b) => a.alongKm - b.alongKm)
    : []
  const summary = routeSummary(trip)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="flex items-stretch border bg-background">
          <div className="flex min-w-0 flex-1 flex-col divide-y">
            <PlaceField
              label={m.trip_from()}
              icon={<IconCircleDot className="text-user" />}
              value={trip.fromMyLocation ? m.my_location() : trip.originName}
              editValue={trip.originName}
              placeholder={m.trip_from_placeholder()}
              allowMyLocation
              // Also when the map's card sends us here for a missing start.
              autoFocus={focusFrom || (trip.active && !trip.origin && view === 'list')}
              onSelect={(place) => {
                setFocusFrom(false)
                actions.setOrigin(place)
              }}
            />
            <PlaceField
              label={m.trip_to()}
              icon={<IconMapPinFilled />}
              value={trip.destinationName}
              editValue={trip.destinationName}
              placeholder={m.trip_to_placeholder()}
              // Phones arrive here from the map's trip button: type right away.
              autoFocus={!trip.active && view === 'list'}
              onSelect={(place) => place && actions.setDestination(place)}
            />
          </div>
          {trip.active && (
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-10 shrink-0 rounded-none border-l"
              aria-label={m.trip_clear()}
              onClick={actions.clear}
            >
              <IconX />
            </Button>
          )}
        </div>

        {!trip.active && <p className="text-xs text-muted-foreground">{m.trip_intro()}</p>}

        {trip.active && (
          <div className="flex items-center gap-2">
            <CorridorToggle value={trip.corridorKm} />
            {summary && (
              <p className="ml-auto truncate text-xs text-muted-foreground tabular-nums">
                {summary}
              </p>
            )}
          </div>
        )}

        {along && along.candidates.length > 0 && (
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={sort}
              aria-label={m.sort_label()}
              onValueChange={(value) => value && setSort(value as SortKey)}
            >
              <ToggleGroupItem value="price" className="h-8 px-3">
                {m.sort_price()}
              </ToggleGroupItem>
              <ToggleGroupItem value="along" className="h-8 px-3">
                {m.sort_along()}
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="ml-auto truncate text-xs text-muted-foreground tabular-nums">
              {corridorSummary(along)}
            </p>
          </div>
        )}
      </div>

      {trip.active && (
        <TripStatus
          trip={trip}
          rows={6}
          onChooseStart={() => setFocusFrom(true)}
          className="px-3"
        />
      )}

      {along && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {stops.map((stop) => (
            <TripStopRow
              key={stop.station.id}
              stop={stop}
              along={along}
              detours={trip.detours}
              onSelect={(id) => setSearch({ station: id, view: 'map' })}
              className={stop.station.id === selected ? 'border-b bg-muted' : 'border-b'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
