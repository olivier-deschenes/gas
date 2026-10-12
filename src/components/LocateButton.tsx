import { useSelector } from '@tanstack/react-store'
import { useMap } from 'react-map-gl/maplibre'
import { IconCurrentLocation, IconLoader2 } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { MAP_ID } from '#/components/map/StationMap'
import { mapPadding } from '#/stores/map'
import { locateOnce, locationStore, setFollow } from '#/stores/location'
import { m } from '#/paraglide/messages'

export function LocateButton() {
  const map = useMap()[MAP_ID]
  const status = useSelector(locationStore, (s) => s.status)
  const driving = useSelector(locationStore, (s) => s.driving)
  const follow = useSelector(locationStore, (s) => s.follow)

  if (driving) {
    if (follow) return null
    return (
      <Button className="h-11 px-4 shadow-lg" onClick={() => setFollow(true)}>
        <IconCurrentLocation />
        {m.recenter()}
      </Button>
    )
  }

  const locating = status === 'locating'
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-11 bg-background shadow-lg dark:bg-background"
      aria-label={locating ? m.locating() : m.locate()}
      disabled={locating}
      onClick={async () => {
        const fix = await locateOnce()
        if (fix && map) {
          map.flyTo({
            center: [fix.lng, fix.lat],
            zoom: Math.max(map.getZoom(), 12.5),
            padding: mapPadding(),
            duration: 1200,
          })
        }
      }}
    >
      {locating ? <IconLoader2 className="animate-spin" /> : <IconCurrentLocation />}
    </Button>
  )
}
