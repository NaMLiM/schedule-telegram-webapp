import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { parseEventText, formatDate, formatDateLong } from '@/lib/date-parser'
import { type RepeatMode, expandDates, getLabel, getDayLabel } from '@/lib/recurrence'
import type { Employee } from '@/types'

interface AddEventModalProps {
  open: boolean
  teamUuid: string | undefined
  employees: Employee[]
  onConfirm: (dates: string[], description: string, empUuids: string[]) => void
  onClose: () => void
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export function AddEventModal({ open, employees, onConfirm, onClose }: AddEventModalProps) {
  const [text, setText] = useState('')
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')
  const [specificDays, setSpecificDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default
  const [repeatCount, setRepeatCount] = useState(7)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setText('')
      setRepeatMode('none')
      setSpecificDays([1, 2, 3, 4, 5])
      setRepeatCount(7)
      setSelected(new Set())
    }
  }, [open])

  const parsed = parseEventText(text)
  const hasPreview = parsed && parsed.dates.length > 0 && text.trim().length > 0

  const allDates = hasPreview && repeatMode !== 'none'
    ? expandDates(parsed.dates, {
        mode: repeatMode,
        daysOfWeek: specificDays,
        count: repeatCount,
      })
    : hasPreview ? parsed.dates : []

  const previewText = allDates.length > 0
    ? allDates.length === 1
      ? `${formatDateLong(allDates[0])}: ${parsed!.description}`
      : `${formatDate(allDates[0])} — ${formatDate(allDates[allDates.length - 1])} (${allDates.length}x): ${parsed!.description}`
    : null

  const showRepeatOptions = hasPreview && repeatMode !== 'none'

  const toggleDay = (day: number) => {
    setSpecificDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleSubmit = () => {
    if (!hasPreview) return
    onConfirm(allDates, parsed!.description, [...selected])
  }

  const toggleEmployee = (uuid: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description & Date</label>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. June 5: Meeting"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
          </div>

          {/* Preview */}
          {previewText && (
            <div className="px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
              <strong>{previewText}</strong>
            </div>
          )}

          {/* Repeat options — only show when parsed date exists */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Repeat</label>
            <div className="flex flex-wrap gap-1.5">
              {(['none', 'daily', 'weekdays', 'specific'] as RepeatMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setRepeatMode(mode)}
                  className={cn(
                    'text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                    repeatMode === mode
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {getLabel(mode, 0)}
                </button>
              ))}
            </div>

            {/* Repeat config — hidden when No repeat */}
            {showRepeatOptions && (
              <div className="mt-3 space-y-3">
                {/* Day-of-week picker for 'specific' */}
                {repeatMode === 'specific' && (
                  <div className="flex gap-1.5 flex-wrap">
                    {ALL_DAYS.map(d => (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={cn(
                          'w-9 h-9 rounded-full text-xs font-medium flex items-center justify-center transition-colors',
                          specificDays.includes(d)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {getDayLabel(d)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Repeat count row */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Repeat count</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={repeatCount}
                    onChange={e => setRepeatCount(Math.max(0, Math.min(365, parseInt(e.target.value) || 0)))}
                    className="w-16 h-8 text-xs rounded border border-input bg-background px-2 text-center"
                  />
                  <span className="text-xs text-muted-foreground">
                    {repeatCount === 0 ? '(always)' : 'times'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Employee selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Assign to {employees.length > 0 && `(${employees.length})`}
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border">
              {employees.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  No employees — sync from HRM first
                </div>
              ) : (
                employees.map(emp => {
                  const isSelected = selected.has(emp.employee_uuid)
                  return (
                    <button
                      key={emp.employee_uuid}
                      onClick={() => toggleEmployee(emp.employee_uuid)}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-accent',
                        isSelected && 'bg-accent'
                      )}
                    >
                      <span className={cn(
                        'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className="flex-1 text-sm">{emp.name}</span>
                      {emp.role === 'lead' && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">Lead</Badge>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!hasPreview}>
            Add Event{allDates.length > 1 ? `s (${allDates.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
