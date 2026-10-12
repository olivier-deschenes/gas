import { queryOptions } from '@tanstack/react-query'
import { fetchStations } from './stations'

export const stationsQueryOptions = queryOptions({
  queryKey: ['stations'],
  queryFn: ({ signal }) => fetchStations(signal),
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
  refetchOnWindowFocus: true,
})
