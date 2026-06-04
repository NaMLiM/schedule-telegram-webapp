import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateLong } from '@/lib/date-parser'
import type { Event, Employee } from '@/types'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface ListViewProps {
  events: Event[]
  employees: Employee[]
  currentUserId: string
  canManage: boolean
  onDelete: (eventId: number, seriesId: string | null) => void
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

export function ListView({ events, employees, currentUserId, canManage, onDelete }: ListViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // Filter events to only the selected month
  const monthEvents = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    return events.filter(e => e.event_date.startsWith(prefix))
  }, [events, year, month])

  // Group by date
  const grouped: Record<string, Event[]> = {}
  monthEvents.forEach(ev => {
    if (!grouped[ev.event_date]) grouped[ev.event_date] = []
    grouped[ev.event_date].push(ev)
  })

  const sortedDates = Object.keys(grouped).sort()

  const goToPrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else { setMonth(m => m - 1) }
  }

  const goToNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else { setMonth(m => m + 1) }
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        <Button variant="ghost" size="sm" onClick={goToPrev}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-medium text-sm">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button variant="ghost" size="sm" onClick={goToNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {monthEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox className="size-8 mb-2" />
          <p>No events this month</p>
        </div>
      ) : (
        <div className="px-4 space-y-4 pb-4">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="text-sm font-semibold text-muted-foreground mb-2">
                {formatDateLong(date)}
              </div>
              <div className="space-y-2">
                {grouped[date].map(ev => {
                  const names = getEmployeeNames(ev.assigned_employee_uuids, employees)
                  const canDelete = canManage || String(ev.created_by_telegram_id) === String(currentUserId)

                  return (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-card"
                    >
                      <div className="min-w-0 space-y-1.5">
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(ev.id, ev.series_id || null)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
