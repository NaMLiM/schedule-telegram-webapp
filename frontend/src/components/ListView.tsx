import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateLong } from '@/lib/date-parser'
import type { Event, Employee } from '@/types'

interface ListViewProps {
  events: Event[]
  employees: Employee[]
  currentUserId: string
  isAdmin: boolean
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

export function ListView({ events, employees, currentUserId, isAdmin, onDelete }: ListViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="text-3xl mb-2">📭</div>
        <p>No scheduled events</p>
      </div>
    )
  }

  // Group by date
  const grouped: Record<string, Event[]> = {}
  events.forEach(ev => {
    if (!grouped[ev.event_date]) grouped[ev.event_date] = []
    grouped[ev.event_date].push(ev)
  })

  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="px-4 space-y-4 pb-4">
      {sortedDates.map(date => (
        <div key={date}>
          <div className="text-sm font-semibold text-muted-foreground mb-2">
            {formatDateLong(date)}
          </div>
          <div className="space-y-2">
            {grouped[date].map(ev => {
              const names = getEmployeeNames(ev.assigned_employee_uuids, employees)
              const canDelete = isAdmin || String(ev.created_by_telegram_id) === String(currentUserId)

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
                      🗑
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
