import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { Command as CommandPrimitive } from 'cmdk'
import { IconCurrentLocation, IconLoader2, IconMapPin } from '@tabler/icons-react'
import { Command, CommandItem, CommandList } from '#/components/ui/command'
import { InputGroup, InputGroupAddon } from '#/components/ui/input-group'
import { placesQueryOptions } from '#/lib/trip.query'
import { cn } from '#/lib/utils'
import { locationStore } from '#/stores/location'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { Place } from '#/lib/places'

const MY_LOCATION = '__my-location'

interface PlaceFieldProps {
  label: string
  icon: React.ReactNode
  /** What the field shows when it isn't being edited. */
  value: string | undefined
  /** Text to start editing from; "my location" starts empty. */
  editValue?: string
  placeholder: string
  /** Offer "Your location" until a search starts; it calls `onSelect(null)`. */
  allowMyLocation?: boolean
  autoFocus?: boolean
  onSelect: (place: Place | null) => void
  className?: string
}

/** A place search box with suggestions from the geocoder. */
export function PlaceField({
  label,
  icon,
  value,
  editValue,
  placeholder,
  allowMyLocation,
  autoFocus,
  onSelect,
  className,
}: PlaceFieldProps) {
  const locale = getLocale()
  const fix = useSelector(locationStore, (s) => s.fix)
  const inputRef = useRef<HTMLInputElement>(null)
  // null while not editing, so the field shows the chosen place.
  const [query, setQuery] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [debounced] = useDebouncedValue(query ?? '', { wait: 250 })
  const places = useQuery(placesQueryOptions(debounced, locale, fix))

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const editing = focused && query != null
  const searching = (query ?? '').trim().length >= 2
  const results = searching ? (places.data ?? []) : []
  const settled = searching && !places.isFetching && debounced === query
  const open = editing && (allowMyLocation || searching)

  const choose = (place: Place | null) => {
    setQuery(null)
    inputRef.current?.blur()
    onSelect(place)
  }

  return (
    <Command
      shouldFilter={false}
      loop
      className={cn('relative size-auto overflow-visible bg-transparent', className)}
    >
      <InputGroup className="h-11 border-0 bg-transparent shadow-none focus-within:bg-muted/60 has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-transparent">
        <InputGroupAddon className="text-muted-foreground">{icon}</InputGroupAddon>
        <CommandPrimitive.Input
          ref={inputRef}
          data-slot="input-group-control"
          aria-label={label}
          placeholder={placeholder}
          value={query ?? value ?? ''}
          onValueChange={setQuery}
          onFocus={(e) => {
            setFocused(true)
            // Coming back to the window refocuses the field: keep the draft.
            if (query != null) return
            setQuery(editValue ?? '')
            const input = e.currentTarget
            requestAnimationFrame(() => input.select())
          }}
          onBlur={() => {
            setFocused(false)
            if (document.hasFocus()) setQuery(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') inputRef.current?.blur()
          }}
          className="h-full min-w-0 flex-1 truncate bg-transparent pr-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        {editing && places.isFetching && (
          <InputGroupAddon align="inline-end">
            <IconLoader2 className="animate-spin" />
          </InputGroupAddon>
        )}
      </InputGroup>

      {open && (
        <CommandList
          // Keep focus in the input so a tap selects before blur closes the list.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-30 max-h-80 border bg-popover shadow-lg shadow-black/10"
        >
          {allowMyLocation && !searching && (
            <CommandItem value={MY_LOCATION} onSelect={() => choose(null)} className="h-11 text-sm">
              <IconCurrentLocation className="text-user" />
              {m.my_location()}
            </CommandItem>
          )}
          {results.map((place) => (
            <CommandItem
              key={place.id}
              value={place.id}
              onSelect={() => choose(place)}
              className="py-2"
            >
              <IconMapPin className="text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{place.name}</div>
                {place.detail && (
                  <div className="truncate text-xs text-muted-foreground">{place.detail}</div>
                )}
              </div>
            </CommandItem>
          ))}
          {searching && !settled && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">{m.places_searching()}</p>
          )}
          {settled && places.isError && (
            <p className="px-3 py-3 text-xs text-muted-foreground">{m.places_failed()}</p>
          )}
          {settled && places.isSuccess && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">{m.places_none()}</p>
          )}
        </CommandList>
      )}
    </Command>
  )
}
