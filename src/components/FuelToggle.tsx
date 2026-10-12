import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { fuelLabel } from '#/lib/i18n'
import { FUELS } from '#/lib/stations'
import { m } from '#/paraglide/messages'
import type { Fuel } from '#/lib/stations'

export function FuelToggle() {
  const { fuel } = useAppSearch()
  const setSearch = useSetSearch()

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={fuel}
      onValueChange={(value) => {
        if (value) setSearch({ fuel: value as Fuel })
      }}
      aria-label={m.fuel_label()}
      className="w-full"
    >
      {FUELS.map((f) => (
        <ToggleGroupItem
          key={f}
          value={f}
          className="h-9 flex-1 text-[13px] data-[state=on]:bg-foreground data-[state=on]:text-background"
        >
          {fuelLabel(f)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
