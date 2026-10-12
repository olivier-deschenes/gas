import { createFileRoute } from '@tanstack/react-router'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="grid h-dvh place-items-center">
      <h1 className="text-2xl font-semibold tracking-tight">{m.app_name()}</h1>
    </main>
  )
}
