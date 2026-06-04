import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { dayKey, dayKeyFromYMD, formatDateLong } from '@/lib/date-parser'
import type { Event, Employee } from '@/types'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarViewProps {
  events: Event[]
  employees: Employee[]
  currentUserId: string
  isAdmin: boolean
  onDelete: (eventId: number, seriesId: string | null) => void
  selectedDate: string | null
  onDateSelect: (date: string | null) => void
}

function getEmployeeNames(uuidJson: string, employees: Employee[]): string[] {
  try {
    const uuids: string[] = JSON.parse(uuidJson)
    if (!Array.isArray(uuids) || uuids.length === 0) return []
    return uuids.map(u => {
      const emp = employees.find(e => e.employee_uuid === u)
      return emp ? emp.name : u
    })
  } catch {
    return []
  }
}

export function CalendarView({ events, employees, currentUserId, isAdmin, onDelete, selectedDate, onDateSelect }: CalendarViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const todayStr = dayKey(now)
  const eventDays = new Set(events.map(e => e.event_date))

  const goToPrev = () => {
    onDateSelect(null)
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else { setMonth(m => m - 1) }
  }

  const goToNext = () => {
    onDateSelect(null)
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else { setMonth(m => m + 1) }
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { label: string; dateStr: string; isOtherMonth: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ label: String(daysInPrevMonth - i), dateStr: '', isOtherMonth: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ label: String(d), dateStr: dayKeyFromYMD(year, month, d), isOtherMonth: false })
  }
  const totalCells = firstDay + daysInMonth
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
  for (let d = 1; d <= remaining; d++) {
    cells.push({ label: String(d), dateStr: '', isOtherMonth: true })
  }

  // Events for selected date
  const dayEvents = selectedDate
    ? events.filter(e => e.event_date === selectedDate)
    : []

  return (
    <div className="px-2 pb-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-2 py-3">
        <Button variant="ghost" size="sm" onClick={goToPrev}><ChevronLeft className="size-4" /></Button>
        <span className="font-medium">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button variant="ghost" size="sm" onClick={goToNext}><ChevronRight className="size-4" /></Button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isToday = cell.dateStr === todayStr
          const isSelected = cell.dateStr === selectedDate
          const hasEvents = eventDays.has(cell.dateStr)

          return (
            <button
              key={i}
              disabled={cell.isOtherMonth}
              onClick={() => cell.dateStr && onDateSelect(cell.dateStr === selectedDate ? null : cell.dateStr)}
              className={`
                aspect-square flex flex-col items-center justify-center text-sm rounded-md
                transition-colors relative
                ${cell.isOtherMonth ? 'text-muted-foreground/30 cursor-default' : 'hover:bg-accent cursor-pointer'}
                ${isToday && !isSelected ? 'bg-primary/10 text-primary font-semibold' : ''}
                ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
              `}
            >
              {cell.label}
              {hasEvents && !cell.isOtherMonth && (
                <span className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isToday ? 'bg-primary' : 'bg-primary/60'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Day task list */}
      {selectedDate && (
        <div className="mt-4 border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{formatDateLong(selectedDate)}</h3>
            <span className="text-xs text-muted-foreground">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
          </div>

          {dayEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No events on this day</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map(ev => {
                const names = getEmployeeNames(ev.assigned_employee_uuids, employees)
                const canDelete = isAdmin || String(ev.created_by_telegram_id) === String(currentUserId)

                return (
                  <div key={ev.id} className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-card">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm">{ev.description}</p>
                      <div className="flex flex-wrap gap-1">
                    {names.length > 0 ? names.map(n => (
                      <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
                    )) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Team task</Badge>
                    )}
                  </div>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => onDelete(ev.id, ev.series_id || null)}
                        className="shrink-0 text-muted-foreground hover:text-destructive text-sm px-1"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
