import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onSingle: () => void
  onSeries: () => void
}

export function DeleteConfirmDialog({ open, onClose, onSingle, onSeries }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Delete event</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This is part of a repeating series. What would you like to delete?
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex flex-col gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="w-full">
              Batal
            </Button>
            <Button variant="secondary" onClick={onSeries} className="w-full">
              Semua (this + future)
            </Button>
            <Button variant="destructive" onClick={onSingle} className="w-full">
              OK (this day only)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
