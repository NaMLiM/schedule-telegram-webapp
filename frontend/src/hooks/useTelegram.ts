import { useEffect, useState, useCallback } from 'react'

export interface TelegramUser {
  id: string
  name: string
}

export function useTelegram() {
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null)
  const [ready, setReady] = useState(false)

  const applyTheme = useCallback(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    const root = document.documentElement
    root.classList.toggle('dark', tg.colorScheme === 'dark')

    const tp = tg.themeParams || {}
    const map: Record<string, string | undefined> = {
      '--tg-theme-bg-color': tp.bg_color,
      '--tg-theme-text-color': tp.text_color,
      '--tg-theme-hint-color': tp.hint_color,
      '--tg-theme-link-color': tp.link_color,
      '--tg-theme-button-color': tp.button_color,
      '--tg-theme-button-text-color': tp.button_text_color,
      '--tg-theme-secondary-bg-color': tp.secondary_bg_color,
      '--tg-theme-header-bg-color': tp.header_bg_color || tp.bg_color,
      '--tg-theme-bottom-bar-bg-color': tp.bottom_bar_bg_color || tp.bg_color,
      '--tg-theme-accent-text-color': tp.accent_text_color || tp.button_color,
      '--tg-theme-section-bg-color': tp.section_bg_color || tp.secondary_bg_color,
      '--tg-theme-section-header-text-color': tp.section_header_text_color || tp.button_color,
      '--tg-theme-subtitle-text-color': tp.subtitle_text_color || tp.hint_color,
      '--tg-theme-destructive-text-color': tp.destructive_text_color,
    }

    for (const [key, val] of Object.entries(map)) {
      if (val) root.style.setProperty(key, val)
    }

    const sa = tg.SafeAreaInset
    if (sa) {
      root.style.setProperty('--safe-area-top', sa.top + 'px')
      root.style.setProperty('--safe-area-bottom', sa.bottom + 'px')
      root.style.setProperty('--safe-area-left', sa.left + 'px')
      root.style.setProperty('--safe-area-right', sa.right + 'px')
    }
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      applyTheme()
      tg.onEvent('themeChanged', applyTheme)

      const user = tg.initDataUnsafe?.user
      if (user) {
        setTgUser({
          id: String(user.id),
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || `User ${user.id}`,
        })
      }

      try {
        tg.setHeaderColor?.('bg_color')
        tg.setBottomBarColor?.('bg_color')
      } catch {
        // silently ignore unsupported methods
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
