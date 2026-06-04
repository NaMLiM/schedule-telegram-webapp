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
import { type RepeatMode, expandDates, getLabel } from '@/lib/recurrence'
import type { Employee } from '@/types'
import { api } from '@/lib/api'

interface AddEventModalProps {
  open: boolean
  teamUuid: string | undefined
  employees: Employee[]
  onConfirm: (dates: string[], description: string, empUuids: string[]) => void
  onClose: () => void
}

export function AddEventModal({ open, teamUuid, employees, onConfirm, onClose }: AddEventModalProps) {
  const [text, setText] = useState('')
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')
  const [repeatInterval, setRepeatInterval] = useState(2)
  const [repeatCount, setRepeatCount] = useState(7)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setText('')
      setRepeatMode('none')
      setRepeatInterval(2)
      setRepeatCount(7)
      setSelected(new Set())
    }
  }, [open])

  const parsed = parseEventText(text)
  const hasPreview = parsed && parsed.dates.length > 0 && text.trim().length > 0

  const allDates = hasPreview
    ? expandDates(parsed.dates, { mode: repeatMode, interval: repeatInterval, count: repeatCount })
    : []

  const previewText = allDates.length > 0
    ? allDates.length === 1
      ? `${formatDateLong(allDates[0])}: ${parsed!.description}`
      : `${formatDate(allDates[0])} — ${formatDate(allDates[allDates.length - 1])} (${allDates.length}x): ${parsed!.description}`
    : null

  const canSubmit = hasPreview

  const handleSubmit = () => {
    if (!canSubmit) return
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
              placeholder="e.g. June 5: Meeting with Alex"
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
          {hasPreview && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Repeat</label>
              <div className="flex flex-wrap gap-1.5">
                {(['none', 'daily', 'weekdays', 'interval'] as RepeatMode[]).map(mode => (
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
                    {getLabel(mode, repeatInterval)}
                  </button>
                ))}
              </div>

              {repeatMode !== 'none' && (
                <div className="flex items-center gap-3 mt-2">
                  {repeatMode === 'interval' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Every</span>
                      <input
                        type="number"
                        min={2}
                        max={30}
                        value={repeatInterval}
                        onChange={e => setRepeatInterval(Math.max(2, Math.min(30, parseInt(e.target.value) || 2)))}
                        className="w-12 h-7 text-xs rounded border border-input bg-background px-1 text-center"
                      />
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">×</span>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={repeatCount}
                      onChange={e => setRepeatCount(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                      className="w-12 h-7 text-xs rounded border border-input bg-background px-1 text-center"
                    />
                    <span className="text-xs text-muted-foreground">times</span>
                  </div>
                </div>
              )}
            </div>
          )}

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
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Add Event{allDates.length > 1 ? `s (${allDates.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
