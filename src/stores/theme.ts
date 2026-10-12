import { createStore } from '@tanstack/react-store'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'plein:theme'
const LIGHT_BG = '#ffffff'
const DARK_BG = '#0a0a0a'

/** Inline script run before hydration so the first paint uses the right theme. */
export const themeScript = `(function(){try{var p=localStorage.getItem('${STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';var m=document.querySelector('meta[name=theme-color]');m&&m.setAttribute('content',d?'${DARK_BG}':'${LIGHT_BG}')}catch(e){}})()`

export const themeStore = createStore<{
  preference: ThemePreference
  resolved: ResolvedTheme
}>({ preference: 'system', resolved: 'light' })

function systemTheme(): ResolvedTheme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(preference: ThemePreference) {
  const resolved = preference === 'system' ? systemTheme() : preference
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
  document
    .querySelector('meta[name=theme-color]')
    ?.setAttribute('content', resolved === 'dark' ? DARK_BG : LIGHT_BG)
  themeStore.setState(() => ({ preference, resolved }))
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Storage can be blocked; the choice still applies for this session.
  }
  apply(preference)
}

/** Sync the store with storage and follow OS changes. Call once on the client. */
export function initTheme() {
  let preference: ThemePreference = 'system'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') preference = stored
  } catch {
    // Fall back to system.
  }
  apply(preference)
  const media = matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (themeStore.state.preference === 'system') apply('system')
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
