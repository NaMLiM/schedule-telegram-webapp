export type RepeatMode = 'none' | 'daily' | 'weekdays' | 'specific'

export interface RepeatConfig {
  mode: RepeatMode
  daysOfWeek: number[] // 0=Sun, 1=Mon...6=Sat — used when mode='specific'
  count: number        // 0 = infinite, N = N occurrences total (incl first)
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const INFINITE_LIMIT = 100 // safety cap for "always" repeats (0 = infinite)

export function getLabel(mode: RepeatMode, _interval: number): string {
  switch (mode) {
    case 'none': return 'No repeat'
    case 'daily': return 'Every day'
    case 'weekdays': return 'Every weekday'
    case 'specific': return 'Specific days'
  }
}

export function getDayLabel(d: number): string {
  return DAY_LABELS[d] || '?'
}

/**
 * Expand base dates + repeat config into a sorted array of date strings.
 * count=0 means infinite (capped at INFINITE_LIMIT).
 */
export function expandDates(
  baseDates: string[],
  repeat: RepeatConfig
): string[] {
  if (repeat.mode === 'none' || repeat.count < 0) return baseDates

  const sorted = [...baseDates].sort()
  const startStr = sorted[0]
  const start = new Date(startStr + 'T00:00:00')
  const result = new Set<string>(baseDates)

  // count=0 = infinite, else N total occurrences
  const target = repeat.count === 0 ? INFINITE_LIMIT : repeat.count
  let generated = 0
  const maxIterations = INFINITE_LIMIT * 2
  let iterations = 0
  const current = new Date(start)

  while (generated < target - 1 && iterations < maxIterations) {
    iterations++

    if (repeat.mode === 'daily') {
      current.setDate(current.getDate() + 1)
    } else if (repeat.mode === 'weekdays') {
      current.setDate(current.getDate() + 1)
      // Skip Sat & Sun
      if (current.getDay() === 0 || current.getDay() === 6) continue
    } else if (repeat.mode === 'specific') {
      current.setDate(current.getDate() + 1)
      // Skip if current day not in selected days
      if (!repeat.daysOfWeek.includes(current.getDay())) continue
    }

    const key = toDateKey(current)
    result.add(key)
    generated++
  }

  return [...result].sort()
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
