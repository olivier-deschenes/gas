import { queryOptions } from '@tanstack/react-query'
import { getStations } from './stations.functions'

export const stationsQueryOptions = queryOptions({
  queryKey: ['stations'],
  queryFn: () => getStations(),
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
  refetchOnWindowFocus: true,
})
