import { useEffect } from 'react'
import { toast } from 'sonner'
import { locationStore } from '#/stores/location'
import { m } from '#/paraglide/messages'
import type { GeoStatus } from '#/stores/location'

const MESSAGES: Partial<Record<GeoStatus, () => string>> = {
  denied: m.geo_denied,
  unavailable: m.geo_unavailable,
  timeout: m.geo_timeout,
  unsupported: m.geo_unsupported,
}

/** Surface geolocation failures once per transition, not on every retry. */
export function useGeoErrorToasts() {
  useEffect(() => {
    let previous = locationStore.state.status
    const sub = locationStore.subscribe(({ status, driving, fix }) => {
      const message = MESSAGES[status]
      // While driving with a recent fix, brief GPS dropouts aren't worth a toast.
      if (status !== previous && message && !(driving && fix && status !== 'denied')) {
        toast.error(message(), { id: 'geo' })
      }
      previous = status
    })
    return () => sub.unsubscribe()
  }, [])
}
