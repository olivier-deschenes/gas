import { useEffect } from 'react'

/** Keep the screen on while `active` (re-acquired when the tab returns). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinel) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        sentinel.addEventListener('release', () => {
          sentinel = null
        })
        if (cancelled) await sentinel.release()
      } catch {
        // Denied (battery saver, unsupported context); nothing else to do.
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release()
    }
  }, [active])
}
