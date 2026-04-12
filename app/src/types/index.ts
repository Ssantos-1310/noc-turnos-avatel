// ── Tipos de dominio ─────────────────────────────────────────────────────────

export type ShiftType = 'M' | 'T' | 'N' | 'V' | 'B' | 'D' | 'O' | 'P' | ''

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'operator' | 'staff'

export type RequestType = 'swap' | 'vacation' | 'personal_day'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Employee {
  id: string
  full_name: string
  short_name: string
  email: string | null
  username: string
  role: UserRole
  active: boolean
  auth_id: string | null
  photo_url: string | null
  dni: string | null
  join_date: string | null
}

export interface Shift {
  id: string
  employee_id: string
  shift_date: string        // YYYY-MM-DD
  shift_type: ShiftType
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShiftRequest {
  id: string
  requester_id: string
  target_id: string | null
  request_type: RequestType
  status: RequestStatus
  requester_date: string | null
  target_date: string | null
  vacation_start: string | null
  vacation_end: string | null
  vacation_year: number | null
  notes: string | null
  resolver_notes: string | null
  resolved_at: string | null
  created_at: string
  // Joined fields
  requester?: Pick<Employee, 'id' | 'full_name' | 'short_name'>
  target?: Pick<Employee, 'id' | 'full_name' | 'short_name'>
}

export interface VacationBalance {
  id: string
  employee_id: string
  year: number
  days_total: number
  days_used: number
  days_remaining: number
}

export interface CoverageRule {
  id: string
  label: string
  unit: string
  weekday_value: number | null
  weekend_value: number | null
  sort_order: number
}

export interface N2Assignment {
  id: string
  week_number: number
  year: number
  employee_id: string
  has_festivo: boolean
  importe_base: number
  importe_festivo: number
  employee?: Pick<Employee, 'short_name' | 'full_name'>
}

// ── Tipos de UI ───────────────────────────────────────────────────────────────

/** Mapa de turnos por mes: { shortName: ShiftType[31] } */
export type MonthShifts = Record<string, ShiftType[]>

export interface Notification {
  id: number
  text: string
  status: RequestStatus
  ts: string
}
