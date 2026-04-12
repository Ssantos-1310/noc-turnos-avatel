// ── Interfaz de servicios de datos ────────────────────────────────────────────
//
// Esta interfaz es el contrato entre la UI y el backend.
// Implementación actual: Supabase  (src/services/supabase/)
// Implementación futura: API REST propia  (src/services/api/)
//
// Para migrar de Supabase a infraestructura propia basta con:
//   1. Implementar estos métodos en src/services/api/
//   2. Cambiar la línea de exportación al final de este fichero
//   NO hay que tocar ningún componente ni vista.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Employee, Shift, ShiftRequest, VacationBalance,
  CoverageRule, N2Assignment, MonthShifts, ShiftType,
} from '../types'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthService {
  /** Inicia sesión y devuelve el perfil de empleado */
  signIn(email: string, password: string): Promise<Employee>
  /** Cierra sesión */
  signOut(): Promise<void>
  /** Devuelve el empleado con sesión activa, o null */
  getCurrentEmployee(): Promise<Employee | null>
}

// ── Turnos ────────────────────────────────────────────────────────────────────

export interface ShiftsService {
  /** Turnos de todos los empleados para un mes dado */
  getMonthShifts(monthIdx: number): Promise<MonthShifts>
  /** Turnos anuales de un empleado (para estadísticas) */
  getEmployeeYearShifts(employeeId: string, year: number): Promise<Shift[]>
  /** Crea o actualiza un turno */
  saveShift(employeeShortName: string, date: string, type: ShiftType): Promise<void>
  /** Elimina el turno de un día */
  deleteShift(employeeId: string, date: string): Promise<void>
}

// ── Solicitudes ───────────────────────────────────────────────────────────────

export interface RequestsService {
  /** Solicitudes pendientes (vista admin) */
  getPendingRequests(): Promise<ShiftRequest[]>
  /** Solicitudes de un empleado */
  getEmployeeRequests(employeeId: string, limit?: number): Promise<ShiftRequest[]>
  /** Crear solicitud */
  createRequest(req: Omit<ShiftRequest, 'id' | 'created_at' | 'resolved_at' | 'status'>): Promise<void>
  /** Aprobar solicitud */
  approveRequest(requestId: string): Promise<void>
  /** Rechazar solicitud */
  rejectRequest(requestId: string, notes?: string): Promise<void>
  /** Cancelar solicitud (por el propio empleado) */
  cancelRequest(requestId: string): Promise<void>
}

// ── Empleados ─────────────────────────────────────────────────────────────────

export interface EmployeesService {
  /** Todos los empleados activos */
  getAll(): Promise<Employee[]>
  /** Actualizar perfil propio */
  updateProfile(employeeId: string, data: Partial<Pick<Employee, 'email' | 'dni' | 'photo_url'>>): Promise<void>
  /** Subir foto de perfil — devuelve la URL pública */
  uploadAvatar(file: File, authUserId: string): Promise<string>
}

// ── Vacaciones ────────────────────────────────────────────────────────────────

export interface VacationService {
  getBalance(employeeId: string, year: number): Promise<VacationBalance | null>
}

// ── Reglas de cobertura ───────────────────────────────────────────────────────

export interface CoverageService {
  getRules(): Promise<CoverageRule[]>
  saveRule(rule: CoverageRule): Promise<void>
  deleteRule(id: string): Promise<void>
}

// ── N2 ────────────────────────────────────────────────────────────────────────

export interface N2Service {
  getAssignments(year: number): Promise<N2Assignment[]>
  saveAssignment(assignment: Omit<N2Assignment, 'id'>): Promise<void>
}

// ── Exportación del adaptador activo ─────────────────────────────────────────
//
// CAMBIO DE BACKEND: sustituir './supabase' por './api' cuando esté lista
// la infraestructura corporativa.
//
export { default as authService } from './supabase/auth'
export { default as shiftsService } from './supabase/shifts'
export { default as requestsService } from './supabase/requests'
export { default as employeesService } from './supabase/employees'
export { default as vacationService } from './supabase/vacation'
export { default as coverageService } from './supabase/coverage'
export { default as n2Service } from './supabase/n2'
