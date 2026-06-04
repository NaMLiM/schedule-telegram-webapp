import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Team } from '@/types'

interface HeaderProps {
  teamName: string
  isAdmin: boolean
  teams: Team[]
  currentTeamUuid: string
  onTeamChange: (uuid: string) => void
  onSync: () => void
}

export function Header({ teamName, isAdmin, teams, currentTeamUuid, onTeamChange, onSync }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-lg font-semibold truncate">{teamName}</h1>
        {isAdmin && (
          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
            Admin
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAdmin && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSync}
              title="Sync employees"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Select value={currentTeamUuid || '__all__'} onValueChange={onTeamChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Teams</SelectItem>
                {teams.map(t => (
                  <SelectItem key={t.uuid} value={t.uuid}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </header>
  )
}
