import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseEventText, formatDate, formatDateLong } from '@/lib/date-parser'

interface AddEventBarProps {
  onAdd: (dates: string[], description: string) => void
}

export function AddEventBar({ onAdd }: AddEventBarProps) {
  const [text, setText] = useState('')

  const parsed = parseEventText(text)
  const hasPreview = parsed && parsed.dates.length > 0 && text.trim().length > 0

  const previewText = hasPreview
    ? parsed.dates.length === 1
      ? `${formatDateLong(parsed.dates[0])}: ${parsed.description}`
      : `${formatDate(parsed.dates[0])} — ${formatDate(parsed.dates[parsed.dates.length - 1])}: ${parsed.description}`
    : null

  const handleSubmit = () => {
    const result = parseEventText(text)
    if (!result || result.dates.length === 0) return
    onAdd(result.dates, result.description)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-card px-4 py-3">
      {previewText && (
        <div className="mb-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
          <strong>{previewText}</strong>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. June 5: Meeting with Alex"
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSubmit}>
          +
        </Button>
      </div>
    </div>
  )
}
