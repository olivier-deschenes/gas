import { Marker } from 'react-map-gl/maplibre'
import type { Fix } from '#/stores/location'

/** Blue position dot with a heading cone, rotated in map space. */
export function UserMarker({ fix }: { fix: Fix }) {
  return (
    <Marker
      longitude={fix.lng}
      latitude={fix.lat}
      anchor="center"
      rotationAlignment="map"
      rotation={fix.heading ?? 0}
      style={{ zIndex: 1 }}
    >
      <div className="pointer-events-none relative size-6">
        {fix.heading != null && (
          <div
            className="absolute bottom-1/2 left-1/2 h-12 w-10 -translate-x-1/2"
            style={{
              background:
                'linear-gradient(to top, color-mix(in oklab, var(--user) 55%, transparent), transparent)',
              clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
            }}
          />
        )}
        <span className="absolute inset-0 animate-ping rounded-full bg-user/30 [animation-duration:2s]" />
        <span className="absolute inset-1 rounded-full border-[3px] border-white bg-user shadow-md shadow-black/30" />
      </div>
    </Marker>
  )
}
