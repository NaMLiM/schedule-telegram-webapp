import { useEffect, useState, useCallback } from 'react'

export interface TelegramUser {
  id: string
  name: string
}

function applySafeArea() {
  const tg = window.Telegram?.WebApp
  if (!tg) return

  const root = document.documentElement

  // Set safe area inset values explicitly on :root (like FTTH does)
  // This is more reliable than relying on CSS cascade from <body>
  const sa = tg.safeAreaInset || {}
  const csa = tg.contentSafeAreaInset || {}

  root.style.setProperty('--tg-safe-area-inset-top', (sa.top ?? 0) + 'px')
  root.style.setProperty('--tg-safe-area-inset-right', (sa.right ?? 0) + 'px')
  root.style.setProperty('--tg-safe-area-inset-bottom', (sa.bottom ?? 0) + 'px')
  root.style.setProperty('--tg-safe-area-inset-left', (sa.left ?? 0) + 'px')

  root.style.setProperty('--tg-content-safe-area-inset-top', (csa.top ?? 0) + 'px')
  root.style.setProperty('--tg-content-safe-area-inset-right', (csa.right ?? 0) + 'px')
  root.style.setProperty('--tg-content-safe-area-inset-bottom', (csa.bottom ?? 0) + 'px')
  root.style.setProperty('--tg-content-safe-area-inset-left', (csa.left ?? 0) + 'px')
}

export function useTelegram() {
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null)
  const [ready, setReady] = useState(false)

  const applyTheme = useCallback(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    const root = document.documentElement
    root.classList.toggle('dark', tg.colorScheme === 'dark')

    applySafeArea()

    const tp = tg.themeParams || {}

    // Map Telegram theme params to shadcn CSS variables
    const map: Record<string, string | undefined> = {
      '--background': tp.bg_color,
      '--foreground': tp.text_color,
      '--muted': tp.secondary_bg_color,
      '--muted-foreground': tp.hint_color,
      '--ring': tp.link_color || tp.button_color,
      '--primary': tp.button_color,
      '--primary-foreground': tp.button_text_color,
      '--secondary': tp.secondary_bg_color,
      '--secondary-foreground': tp.text_color,
      '--card': tp.section_bg_color || tp.secondary_bg_color || tp.bg_color,
      '--card-foreground': tp.text_color,
      '--popover': tp.section_bg_color || tp.secondary_bg_color || tp.bg_color,
      '--popover-foreground': tp.text_color,
      '--destructive': tp.destructive_text_color || '#ff3b30',
      '--destructive-foreground': tp.button_text_color || tp.bg_color,
      '--accent': tp.section_header_text_color || tp.button_color,
      '--accent-foreground': tp.button_text_color || tp.text_color,
      '--border': tp.hint_color || tp.secondary_bg_color,
      '--input': tp.hint_color || tp.secondary_bg_color,
    }

    for (const [key, val] of Object.entries(map)) {
      if (val) root.style.setProperty(key, val)
    }

    // Match Telegram's native header/bottom bar background
    try {
      tg.setHeaderColor?.('bg_color')
      tg.setBottomBarColor?.('bg_color')
    } catch {
      // unsupported on older clients
    }
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      applyTheme()

      // Listen for live safe area changes (e.g. toggle fullscreen)
      tg.onEvent('themeChanged', applyTheme)
      tg.onEvent('safeAreaChanged', applySafeArea)
      tg.onEvent('contentSafeAreaChanged', applySafeArea)

      const user = tg.initDataUnsafe?.user
      if (user) {
        setTgUser({
          id: String(user.id),
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || `User ${user.id}`,
        })
      }
    } else {
      // Dev mode fallback
      setTgUser({
        id: 'dev-' + Math.random().toString(36).slice(2, 9),
        name: 'Dev User',
      })
      console.log('[dev] Using test ID')
    }

    setReady(true)
  }, [applyTheme])

  return { tgUser, ready }
}
