export type RepeatMode = 'none' | 'daily' | 'weekdays' | 'interval'

export interface RepeatConfig {
  mode: RepeatMode
  interval: number // e.g. 3 for "every 3 days"
  count: number   // total occurrences (including the first)
}

const DEFAULT_COUNT = 14
const MAX_COUNT = 90

export function getLabel(mode: RepeatMode, interval: number): string {
  switch (mode) {
    case 'none': return 'No repeat'
    case 'daily': return 'Every day'
    case 'weekdays': return 'Every weekday'
    case 'interval': return `Every ${interval} days`
  }
}

export function expandDates(
  baseDates: string[],
  repeat: RepeatConfig
): string[] {
  if (repeat.mode === 'none' || repeat.count <= 1) return baseDates

  // Take the earliest date from the base set
  const sorted = [...baseDates].sort()
  const startStr = sorted[0]
  const start = new Date(startStr + 'T00:00:00')
  const result = new Set<string>(baseDates)

  let generated = 0
  const maxIterations = MAX_COUNT * 2 // safety guard
  let iterations = 0
  const current = new Date(start)

  while (generated < repeat.count - 1 && iterations < maxIterations) {
    iterations++

    if (repeat.mode === 'daily') {
      current.setDate(current.getDate() + 1)
    } else if (repeat.mode === 'interval') {
      current.setDate(current.getDate() + repeat.interval)
    } else if (repeat.mode === 'weekdays') {
      current.setDate(current.getDate() + 1)
      // Skip weekends
      if (current.getDay() === 0 || current.getDay() === 6) continue
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
