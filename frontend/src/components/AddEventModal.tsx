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
import { Calendar, Check } from 'lucide-react'
import { parseEventText, formatDate, formatDateLong } from '@/lib/date-parser'
import { type RepeatMode, expandDates, getLabel, getDayLabel } from '@/lib/recurrence'
import type { Employee } from '@/types'

interface AddEventModalProps {
  open: boolean
  prefillDate: string
  teamUuid: string | undefined
  employees: Employee[]
  onConfirm: (dates: string[], description: string, empUuids: string[]) => void
  onClose: () => void
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export function AddEventModal({ open, prefillDate, employees, onConfirm, onClose }: AddEventModalProps) {
  const [text, setText] = useState('')
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')
  const [specificDays, setSpecificDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [repeatCount, setRepeatCount] = useState(7)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  // When a date is pre-filled from the calendar, use it directly.
  // Otherwise fall back to text-based date parsing.
  const hasPrefill = true
  const parsed = hasPrefill
    ? { dates: [prefillDate], description: text.trim() }
    : parseEventText(text)

  const hasValidInput = hasPrefill
    ? text.trim().length > 0
    : !!(parsed && parsed.dates.length > 0 && text.trim().length > 0)

  const allDates = hasValidInput && repeatMode !== 'none'
    ? expandDates(parsed!.dates, {
        mode: repeatMode,
        daysOfWeek: specificDays,
        count: repeatCount,
      })
    : parsed?.dates || []

  const previewText = allDates.length > 0
    ? allDates.length === 1
      ? `${formatDateLong(allDates[0])}: ${parsed!.description}`
      : `${formatDate(allDates[0])} — ${formatDate(allDates[allDates.length - 1])} (${allDates.length}x): ${parsed!.description}`
    : null

  const showRepeatOptions = hasValidInput && repeatMode !== 'none'

  const toggleDay = (day: number) => {
    setSpecificDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleSubmit = async () => {
    if (!hasValidInput || !parsed) return
    setSubmitError(null)
    try {
      await onConfirm(allDates, parsed.description, [...selected])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSubmitError(msg)
      console.error('[AddEvent] Submit failed:', err)
    }
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
          {/* Date display when pre-filled from calendar */}
          {hasPrefill && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-sm font-medium text-primary">
              <Calendar className="size-4 shrink-0" />
              <span>
                {formatDateLong(prefillDate)}
              </span>
            </div>
          )}

          {/* Event description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {hasPrefill ? 'Description' : 'Description & Date'}
            </label>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={hasPrefill ? 'e.g. Meeting with Alex' : 'e.g. June 5: Meeting'}
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

          {/* Repeat options */}
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

                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Repeat count</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={repeatCount}
                    onChange={e => setRepeatCount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
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
              Assign to {employees.length > 0 && `(${employees.length})`} — leave empty = team task
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
                        {isSelected ? <Check className="size-3" /> : ''}
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

        {submitError && (
          <div className="px-3 py-2 rounded-md bg-destructive/10 text-xs text-destructive border border-destructive/20">
            <strong>Error:</strong> {submitError}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!hasValidInput}>
            Add Event{allDates.length > 1 ? `s (${allDates.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
