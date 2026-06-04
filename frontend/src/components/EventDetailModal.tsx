import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateLong } from '@/lib/date-parser'
import type { Event, Employee } from '@/types'

interface EventDetailModalProps {
  date: string | null
  events: Event[]
  employees: Employee[]
  onClose: () => void
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

export function EventDetailModal({ date, events, employees, onClose }: EventDetailModalProps) {
  const dayEvents = date ? events.filter(e => e.event_date === date) : []

  return (
    <Dialog open={!!date} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{date ? formatDateLong(date) : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No events on this day
            </p>
          ) : (
            dayEvents.map(ev => {
              const names = getEmployeeNames(ev.assigned_employee_uuids, employees)
              return (
                <div key={ev.id} className="p-3 rounded-lg border bg-card space-y-1.5">
                  <p className="text-sm">{ev.description}</p>
                  {names.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {names.map(n => (
                        <Badge key={n} variant="secondary" className="text-xs">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
