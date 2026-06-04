import { useState } from 'react'
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
import type { Employee } from '@/types'

interface EmployeePickerProps {
  open: boolean
  employees: Employee[]
  onConfirm: (selectedUuids: string[]) => void
  onCancel: () => void
}

export function EmployeePicker({ open, employees, onConfirm, onCancel }: EmployeePickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (uuid: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uuid)) {
        next.delete(uuid)
      } else {
        next.add(uuid)
      }
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm([...selected])
    setSelected(new Set())
  }

  const handleCancel = () => {
    setSelected(new Set())
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Select Employees</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No employees to select
            </p>
          ) : (
            employees.map(emp => {
              const isSelected = selected.has(emp.employee_uuid)
              return (
                <button
                  key={emp.employee_uuid}
                  onClick={() => toggle(emp.employee_uuid)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left transition-colors hover:bg-accent',
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
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
