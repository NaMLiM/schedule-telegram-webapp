import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { dayKey, dayKeyFromYMD } from '@/lib/date-parser'
import type { Event } from '@/types'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarViewProps {
  events: Event[]
  onDayClick: (date: string) => void
}

export function CalendarView({ events, onDayClick }: CalendarViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const todayStr = dayKey(now)
  const eventDays = new Set(events.map(e => e.event_date))

  const goToPrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear(y => y - 1)
    } else {
      setMonth(m => m - 1)
    }
  }

  const goToNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { label: string; dateStr: string; isOtherMonth: boolean }[] = []

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    cells.push({ label: String(day), dateStr: '', isOtherMonth: true })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = dayKeyFromYMD(year, month, d)
    cells.push({ label: String(d), dateStr, isOtherMonth: false })
  }

  // Next month leading days
  const totalCells = firstDay + daysInMonth
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
  for (let d = 1; d <= remaining; d++) {
    cells.push({ label: String(d), dateStr: '', isOtherMonth: true })
  }

  return (
    <div className="px-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-2 py-3">
        <Button variant="ghost" size="sm" onClick={goToPrev}>◀</Button>
        <span className="font-medium">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button variant="ghost" size="sm" onClick={goToNext}>▶</Button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isToday = cell.dateStr === todayStr
          const hasEvents = eventDays.has(cell.dateStr)

          return (
            <button
              key={i}
              disabled={cell.isOtherMonth}
              onClick={() => cell.dateStr && onDayClick(cell.dateStr)}
              className={`
                aspect-square flex flex-col items-center justify-center text-sm rounded-md
                transition-colors
                ${cell.isOtherMonth ? 'text-muted-foreground/30 cursor-default' : 'hover:bg-accent cursor-pointer'}
                ${isToday ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
              `}
            >
              {cell.label}
              {hasEvents && !cell.isOtherMonth && (
                <span className={`
                  w-1.5 h-1.5 rounded-full mt-0.5
                  ${isToday ? 'bg-primary-foreground' : 'bg-primary'}
                `} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
