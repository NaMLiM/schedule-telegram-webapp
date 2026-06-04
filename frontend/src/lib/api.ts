let tgId: string | null = null

export function setTgId(id: string) {
  tgId = id
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Merge provided headers
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => { headers[key] = value })
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => { headers[key] = value })
    } else {
      Object.assign(headers, options.headers as Record<string, string>)
    }
  }

  if (tgId) headers['x-telegram-id'] = String(tgId)
  if (window.Telegram?.WebApp?.initData) {
    headers['x-init-data'] = window.Telegram.WebApp.initData
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      return null
    }
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json()
}
