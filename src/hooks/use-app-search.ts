import { getRouteApi } from '@tanstack/react-router'
import type { AppSearch } from '#/routes/index'

export const appRoute = getRouteApi('/')

export function useAppSearch() {
  return appRoute.useSearch()
}

/** Merge a patch into the URL state. Replaces history unless `push` is set. */
export function useSetSearch() {
  const navigate = appRoute.useNavigate()
  return (patch: Partial<AppSearch>, { push = false } = {}) =>
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, ...patch }),
      replace: !push,
    })
}
