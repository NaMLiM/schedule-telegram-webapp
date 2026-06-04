import { Ban } from 'lucide-react'

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      <div className="text-center space-y-3 max-w-xs">
        <Ban className="size-12 mx-auto text-destructive" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">
          You are not registered as an employee.
        </p>
        <p className="text-xs text-muted-foreground">
          Please contact your administrator.
        </p>
      </div>
    </div>
  )
}
