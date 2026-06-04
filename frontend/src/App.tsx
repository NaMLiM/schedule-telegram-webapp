import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTelegram } from '@/hooks/useTelegram'
import { api, setTgId } from '@/lib/api'
import { dayKey } from '@/lib/date-parser'
import type { UserInfo, Team, Employee, Event } from '@/types'
import { LoadingScreen } from '@/components/LoadingScreen'
import { AccessDenied } from '@/components/AccessDenied'
import { Header } from '@/components/Header'
import { TabBar } from '@/components/TabBar'
import { CalendarView } from '@/components/CalendarView'
import { ListView } from '@/components/ListView'
import { Plus } from 'lucide-react'
import { AddEventModal } from '@/components/AddEventModal'

import { Toaster } from '@/components/ui/sonner'

export default function App() {
  const { tgUser, ready: tgReady } = useTelegram()

  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [currentTeamUuid, setCurrentTeamUuid] = useState('')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string>(dayKey(new Date()))
  const [showAddModal, setShowAddModal] = useState(false)

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
        toast.success(`Synced — ${data.teams_count} teams loaded`)
        const teamData = await api<{ teams: Team[] }>('/api/teams')
        if (teamData) {
          setTeams(teamData.teams)
          // If admin was on 'All Teams', switch to the first synced team
          // so employees load immediately
          if (isAdmin && currentTeamUuid === '__all__' && teamData.teams.length > 0) {
            setCurrentTeamUuid(teamData.teams[0].uuid)
          }
        }
        await fetchEvents()
      }
    } catch {
      toast.error('Sync failed')
    }
  }

  async function handleAddEvent(dates: string[], description: string, empUuids: string[]) {
    const teamUuid = isAdmin ? currentTeamUuid : userInfo?.team?.uuid
    if (!teamUuid) {
      toast.error('No team selected')
      return
    }
    try {
      // Generate a series_id if creating multiple events (recurrence)
      const seriesId = dates.length > 1 ? crypto.randomUUID() : undefined

      for (const date of dates) {
        const body: Record<string, unknown> = {
          event_date: date,
          description,
          assigned_employee_uuids: empUuids,
        }
        if (seriesId) body.series_id = seriesId
        if (isAdmin) body.team_uuid = teamUuid
        await api('/api/events', { method: 'POST', body: JSON.stringify(body) })
      }
      toast.success(`Event${dates.length > 1 ? 's' : ''} added`)
      setShowAddModal(false)
      await fetchEvents()
    } catch {
      toast.error('Failed to add event')
    }
  }

  async function handleDeleteEvent(eventId: number, seriesId: string | null) {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    // If part of a series, ask how to delete
    if (seriesId && !confirm('Delete only this day? OK = this day only, Cancel = this and all future dates')) {
      // Cancel = delete this and future
      try {
        const data = await api<{ count: number }>(`/api/events/${eventId}?mode=series`, { method: 'DELETE' })
        if (data) toast.success(`Deleted ${data.count} event${data.count > 1 ? 's' : ''}`)
        await fetchEvents()
      } catch {
        toast.error('Failed to delete events')
      }
    } else {
      // OK or no series = delete single
      try {
        await api(`/api/events/${eventId}?mode=single`, { method: 'DELETE' })
        toast.success('Event deleted')
        await fetchEvents()
      } catch {
        toast.error('Failed to delete event')
      }
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
      <main className="flex-1 overflow-auto">
        {viewMode === 'calendar' ? (
          <CalendarView
            events={events}
            employees={employees}
            currentUserId={userId}
            isAdmin={isAdmin}
            onDelete={handleDeleteEvent}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
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
      <AddEventModal
        open={showAddModal}
        prefillDate={selectedDate}
        teamUuid={isAdmin ? currentTeamUuid : userInfo?.team?.uuid}
        employees={employees}
        onConfirm={handleAddEvent}
        onClose={() => setShowAddModal(false)}
      />

      {/* FAB button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 z-30 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl active:scale-95 transition-transform"
        style={{ marginBottom: 'var(--content-safe-area-bottom, var(--safe-area-bottom))' }}
      >
        <Plus className="size-6" />
      </button>

      <TabBar activeTab={viewMode} onTabChange={setViewMode} />
      <Toaster />
    </div>
  )
}
