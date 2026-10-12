import { createServerFn } from '@tanstack/react-start'
import { SOURCE_URL, normalizeStations } from './stations'
import type { StationsData } from './stations'

const TTL_MS = 60_000

// Per-isolate cache so a burst of visitors doesn't refetch the 1.3 MB feed.
let cached: { at: number; data: StationsData } | undefined

async function readJson(res: Response): Promise<unknown> {
  const bytes = new Uint8Array(await res.arrayBuffer())
  // The blob is normally served with `content-encoding: gzip` and decoded by
  // fetch; fall back to manual decompression if it ever arrives raw.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).json()
  }
  return JSON.parse(new TextDecoder().decode(bytes))
}

export const getStations = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StationsData> => {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.data

    const res = await fetch(SOURCE_URL, {
      headers: { accept: 'application/geo+json, application/json' },
    })
    if (!res.ok) throw new Error(`Price feed responded ${res.status}`)

    const data = normalizeStations(await readJson(res))
    cached = { at: Date.now(), data }
    return data
  },
)
