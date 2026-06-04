import { useState, useEffect } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { api, setTgId } from '@/lib/api'
import type { UserInfo, Team, Employee, Event } from '@/types'
import { LoadingScreen } from '@/components/LoadingScreen'
import { AccessDenied } from '@/components/AccessDenied'
import { Header } from '@/components/Header'
import { TabBar } from '@/components/TabBar'
import { CalendarView } from '@/components/CalendarView'
import { ListView } from '@/components/ListView'
import { AddEventBar } from '@/components/AddEventBar'
import { EmployeePicker } from '@/components/EmployeePicker'
import { EventDetailModal } from '@/components/EventDetailModal'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'

export default function App() {
  const { tgUser, ready: tgReady } = useTelegram()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [currentTeamUuid, setCurrentTeamUuid] = useState('')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [detailDate, setDetailDate] = useState<string | null>(null)
  const [pickerState, setPickerState] = useState<{ dates: string[]; description: string } | null>(null)

  const isAdmin = userInfo?.is_admin ?? false
  const userId = tgUser?.id || ''

  async function fetchEvents() {
    if (!userInfo) return
    try {
      let url: string
      if (userInfo.is_admin) {
        if (currentTeamUuid && currentTeamUuid !== '__all__') {
          url = `/api/events?team_uuid=${encodeURIComponent(currentTeamUuid)}`
        } else {
          url = '/api/events/all'
        }
      } else {
        url = '/api/events'
      }
      const data = await api<{ events: Event[] }>(url)
      if (data) setEvents(data.events)
    } catch (err) {
      console.error('Failed to fetch events:', err)
    }
  }

  // Initialization
  useEffect(() => {
    if (!tgReady || !tgUser) return
    setTgId(tgUser.id)

    async function init() {
      try {
        const userData = await api<UserInfo>('/api/user/me')
        if (!userData) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        setUserInfo(userData)

        if (userData.is_admin) {
          const teamData = await api<{ teams: Team[] }>('/api/teams')
          if (teamData) setTeams(teamData.teams)
          setCurrentTeamUuid(userData.team?.uuid || '__all__')
        } else {
          setCurrentTeamUuid(userData.team?.uuid || '')
        }

        setLoading(false)
      } catch (err) {
        console.error('Init failed:', err)
        setAccessDenied(true)
        setLoading(false)
      }
    }

    init()
  }, [tgReady, tgUser])

  // Fetch events when userInfo or team changes
  useEffect(() => {
    if (userInfo) fetchEvents()
  }, [userInfo, currentTeamUuid])

  // Load employees for current team
  useEffect(() => {
    if (!currentTeamUuid || currentTeamUuid === '__all__') return
    api<{ employees: Employee[] }>(
      `/api/teams/${encodeURIComponent(currentTeamUuid)}/employees`
    ).then(data => {
      if (data) setEmployees(data.employees)
    })
  }, [currentTeamUuid])

  async function handleSync() {
    try {
      const data = await api<{ teams_count: number }>('/api/sync-hrm', { method: 'POST' })
      if (data) {
        toast({ title: `Synced — ${data.teams_count} teams loaded` })
        const teamData = await api<{ teams: Team[] }>('/api/teams')
        if (teamData) setTeams(teamData.teams)
        await fetchEvents()
      }
    } catch {
      toast({ title: 'Sync failed', variant: 'destructive' })
    }
  }

  async function handleConfirmEvent(empUuids: string[]) {
    if (!pickerState) return
    const teamUuid = isAdmin ? currentTeamUuid : userInfo?.team?.uuid
    if (!teamUuid) {
      toast({ title: 'No team selected', variant: 'destructive' })
      return
    }
    try {
      for (const date of pickerState.dates) {
        const body: Record<string, unknown> = {
          event_date: date,
          description: pickerState.description,
          assigned_employee_uuids: empUuids,
        }
        if (isAdmin) body.team_uuid = teamUuid
        await api('/api/events', { method: 'POST', body: JSON.stringify(body) })
      }
      toast({ title: `Event${pickerState.dates.length > 1 ? 's' : ''} added` })
      setPickerState(null)
      await fetchEvents()
    } catch {
      toast({ title: 'Failed to add event', variant: 'destructive' })
    }
  }

  async function handleDeleteEvent(eventId: number) {
    try {
      await api(`/api/events/${eventId}`, { method: 'DELETE' })
      toast({ title: 'Event deleted' })
      await fetchEvents()
    } catch {
      toast({ title: 'Failed to delete event', variant: 'destructive' })
    }
  }

  function getTeamName(): string {
    if (currentTeamUuid === '__all__') return 'All Teams'
    if (userInfo?.team?.name && !isAdmin) return userInfo.team.name
    if (currentTeamUuid && isAdmin) {
      const team = teams.find(t => t.uuid === currentTeamUuid)
      if (team) return team.name
    }
    return 'My Team'
  }

  if (!tgReady || loading) return <LoadingScreen />
  if (accessDenied) return <AccessDenied />

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
      <Header
        teamName={getTeamName()}
        isAdmin={isAdmin}
        teams={teams}
        currentTeamUuid={currentTeamUuid}
        onTeamChange={setCurrentTeamUuid}
        onSync={handleSync}
      />
      <TabBar activeTab={viewMode} onTabChange={setViewMode} />
      <main className="flex-1 overflow-auto">
        {viewMode === 'calendar' ? (
          <CalendarView events={events} onDayClick={setDetailDate} />
        ) : (
          <ListView
            events={events}
            employees={employees}
            currentUserId={userId}
            isAdmin={isAdmin}
            onDelete={handleDeleteEvent}
          />
        )}
      </main>
      <AddEventBar onAdd={(dates, desc) => setPickerState({ dates, description: desc })} />
      <EmployeePicker
        open={!!pickerState}
        employees={employees}
        onConfirm={handleConfirmEvent}
        onCancel={() => setPickerState(null)}
      />
      <EventDetailModal
        date={detailDate}
        events={events}
        employees={employees}
        onClose={() => setDetailDate(null)}
      />
      <Toaster />
    </div>
  )
}
