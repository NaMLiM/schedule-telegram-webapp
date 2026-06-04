const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dayKeyFromYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatDate(ts: string): string {
  const d = new Date(ts + 'T00:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

export function formatDateLong(ts: string): string {
  const d = new Date(ts + 'T00:00:00')
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function isToday(ts: string): boolean {
  return dayKey(new Date()) === ts
}

export interface ParseResult {
  dates: string[]
  description: string
}

export function parseEventText(text: string): ParseResult | null {
  text = text.trim()
  if (!text) return null

  let desc = text
  let dates: string[] = []

  // 1. "June 5-7: desc" or "June 5 - 7: desc" — date range
  const rangeRegex = /^(?:on\s+)?([A-Z][a-z]+)\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*[:：]\s*(.+)/i
  const rangeMatch = desc.match(rangeRegex)
  if (rangeMatch) {
    const month = MONTH_NAMES.findIndex(m => m.toLowerCase() === rangeMatch[1].toLowerCase())
    if (month >= 0) {
      const year = new Date().getFullYear()
      const startDay = parseInt(rangeMatch[2])
      const endDay = parseInt(rangeMatch[3])
      for (let d = startDay; d <= endDay; d++) {
        dates.push(dayKey(new Date(year, month, d)))
      }
      return { dates, description: rangeMatch[4].trim() }
    }
  }

  // 2. "June 3: desc" or "June 3 desc" or "on June 3: desc"
  const datePrefixRegex = /^(?:on\s+)?([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[:：]?\s*(.*)/i
  const dateMatch = desc.match(datePrefixRegex)
  if (dateMatch) {
    const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === dateMatch[1].toLowerCase())
    if (monthIdx >= 0) {
      const day = parseInt(dateMatch[2])
      const year = new Date().getFullYear()
      const date = dayKey(new Date(year, monthIdx, day))
      const remaining = dateMatch[3].trim()
      return { dates: [date], description: remaining || text }
    }
  }

  // 3. "tomorrow" keyword
  const tomorrowRegex = /^tomorrow\s*[:：]?\s*(.*)/i
  const tomorrowMatch = desc.match(tomorrowRegex)
  if (tomorrowMatch) {
    const tmr = new Date()
    tmr.setDate(tmr.getDate() + 1)
    dates = [dayKey(tmr)]
    desc = tomorrowMatch[1].trim() || text.replace(/^tomorrow\s*/i, '')
    return { dates, description: desc }
  }

  // 4. "next Monday/Tuesday/etc" → next occurrence
  const nextDayRegex = /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:：]?\s*(.*)/i
  const nextDayMatch = desc.match(nextDayRegex)
  if (nextDayMatch) {
    const targetDay = DAY_NAMES.indexOf(nextDayMatch[1].toLowerCase())
    const today = new Date()
    const daysUntil = ((targetDay + 7 - today.getDay()) % 7) + 7 // Next week
    const target = new Date(today)
    target.setDate(today.getDate() + daysUntil)
    dates = [dayKey(target)]
    return { dates, description: nextDayMatch[2].trim() || text }
  }

  // 5. "Monday/Tuesday" (bare day name) → closest future occurrence
  const dayNameRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:：]?\s*(.*)/i
  const dayNameMatch = desc.match(dayNameRegex)
  if (dayNameMatch) {
    const targetDay = DAY_NAMES.indexOf(dayNameMatch[1].toLowerCase())
    const today = new Date()
    let daysUntil = (targetDay + 7 - today.getDay()) % 7
    if (daysUntil === 0) daysUntil = 7 // If it's today, go next week
    const target = new Date(today)
    target.setDate(today.getDate() + daysUntil)
    dates = [dayKey(target)]
    return { dates, description: dayNameMatch[2].trim() || text }
  }

  // 6. "in N days"
  const inDaysRegex = /^in\s+(\d+)\s+days?\s*[:：]?\s*(.*)/i
  const inDaysMatch = desc.match(inDaysRegex)
  if (inDaysMatch) {
    const n = parseInt(inDaysMatch[1])
    const target = new Date()
    target.setDate(target.getDate() + n)
    dates = [dayKey(target)]
    return { dates, description: inDaysMatch[2].trim() || text }
  }

  // 7. Fallback: today
  return { dates: [dayKey(new Date())], description: text }
}
