export interface Team {
  id: number
  uuid: string
  name: string
  team_type: string
  is_active: boolean
}

export interface Employee {
  id: number
  employee_uuid: string
  name: string
  employee_number: string | null
  role: string
}

export interface Event {
  id: number
  team_uuid: string
  event_date: string
  description: string
  assigned_employee_uuids: string
  created_by_telegram_id: string | null
  created_at: string
  series_id: string | null
}

export interface UserInfo {
  telegram_id: string
  is_admin: boolean
  role: string | null
  team: { uuid: string; name: string } | null
  display_name: string | null
}
