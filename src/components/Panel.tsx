import { RegionList } from '#/components/RegionList'
import { StationList } from '#/components/StationList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { SOURCE_URL } from '#/lib/stations'
import { m } from '#/paraglide/messages'

/** Stations / Regions lists: the sidebar on desktop, the list view on mobile. */
export function Panel() {
  const { tab } = useAppSearch()
  const setSearch = useSetSearch()

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearch({ tab: value as typeof tab })}
      className="min-h-0 flex-1 gap-0"
    >
      <TabsList variant="line" className="w-full justify-start gap-4 border-b px-3">
        <TabsTrigger value="stations" className="flex-none px-0 text-[13px]">
          {m.tab_stations()}
        </TabsTrigger>
        <TabsTrigger value="regions" className="flex-none px-0 text-[13px]">
          {m.tab_regions()}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="stations" className="flex min-h-0 flex-col data-[state=inactive]:hidden">
        <StationList />
      </TabsContent>
      <TabsContent value="regions" className="flex min-h-0 flex-col data-[state=inactive]:hidden">
        <RegionList />
      </TabsContent>
      <footer className="border-t px-3 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] text-[11px] text-muted-foreground">
        <a
          href={new URL('/', SOURCE_URL).href}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          {m.source_credit()}
        </a>
      </footer>
    </Tabs>
  )
}
