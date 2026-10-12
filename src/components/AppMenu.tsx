import { IconDots } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { setThemePreference, themeStore } from '#/stores/theme'
import { getLocale, setLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { ThemePreference } from '#/stores/theme'

const LANGUAGES = [
  { locale: 'fr', label: 'Français' },
  { locale: 'en', label: 'English' },
] as const

export function AppMenu() {
  const preference = useSelector(themeStore, (s) => s.preference)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={m.menu()}>
          <IconDots />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{m.language_label()}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={getLocale()}
          onValueChange={(value) => setLocale(value as 'fr' | 'en')}
        >
          {LANGUAGES.map((l) => (
            <DropdownMenuRadioItem key={l.locale} value={l.locale}>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{m.theme_label()}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => setThemePreference(value as ThemePreference)}
        >
          <DropdownMenuRadioItem value="system">{m.theme_system()}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">{m.theme_light()}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{m.theme_dark()}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
