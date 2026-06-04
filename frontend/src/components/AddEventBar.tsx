import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseEventText, formatDate, formatDateLong } from '@/lib/date-parser'
import { type RepeatConfig, type RepeatMode, expandDates, getLabel } from '@/lib/recurrence'

interface AddEventBarProps {
  onAdd: (dates: string[], description: string) => void
}

export function AddEventBar({ onAdd }: AddEventBarProps) {
  const [text, setText] = useState('')
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')
  const [repeatInterval, setRepeatInterval] = useState(2)
  const [repeatCount, setRepeatCount] = useState(7)

  const parsed = parseEventText(text)
  const hasPreview = parsed && parsed.dates.length > 0 && text.trim().length > 0

  // Expand dates with repeat config
  const allDates = parsed && hasPreview
    ? expandDates(parsed.dates, { mode: repeatMode, interval: repeatInterval, count: repeatCount })
    : []

  const previewText = allDates.length > 0
    ? allDates.length === 1
      ? `${formatDateLong(allDates[0])}: ${parsed!.description}`
      : `${formatDate(allDates[0])} — ${formatDate(allDates[allDates.length - 1])} (${allDates.length}x): ${parsed!.description}`
    : null

  const handleSubmit = () => {
    const result = parseEventText(text)
    if (!result || result.dates.length === 0) return
    const expanded = expandDates(result.dates, { mode: repeatMode, interval: repeatInterval, count: repeatCount })
    onAdd(expanded, result.description)
    setText('')
    setRepeatMode('none')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="border-t bg-card px-4 py-3 pb-[calc(0.75rem+var(--safe-area-bottom,0px))]">
      {previewText && (
        <div className="mb-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
          <strong>{previewText}</strong>
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. June 5: Meeting with Alex"
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button size="icon" className="size-10 shrink-0" onClick={handleSubmit}>
          +
        </Button>
      </div>

      {/* Repeat options */}
      {hasPreview && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Repeat:</span>

          <div className="flex gap-1">
            {(['none', 'daily', 'weekdays', 'interval'] as RepeatMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setRepeatMode(mode)}
                className={`
                  text-xs px-2.5 py-1 rounded-full border transition-colors
                  ${repeatMode === mode
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  }
                `}
              >
                {getLabel(mode, repeatInterval)}
              </button>
            ))}
          </div>

          {repeatMode === 'interval' && (
            <div className="flex items-center gap-1">
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

          {repeatMode !== 'none' && (
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
          )}
        </div>
      )}
    </div>
  )
}
