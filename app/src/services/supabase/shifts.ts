import { sb } from './client'
import type { ShiftsService } from '../index'
import type { MonthShifts, Shift, ShiftType } from '../../types'
import { monthEndDate } from '../../constants'

// Caché en memoria por clave 'YYYY-MM'
const cache: Record<string, MonthShifts> = {}

export function invalidateMonth(monthIdx: number) {
  const key = `2026-${String(monthIdx + 1).padStart(2, '0')}`
  delete cache[key]
}

const shiftsService: ShiftsService = {
  async getMonthShifts(monthIdx) {
    const key = `2026-${String(monthIdx + 1).padStart(2, '0')}`
    if (cache[key]) return cache[key]

    const start = `${key}-01`
    // Usa el último día real del mes (evita el bug de '2026-04-31')
    const end = monthEndDate(monthIdx)

    const { data, error } = await sb
      .from('shifts')
      .select('shift_date, shift_type, employee:employee_id(short_name)')
      .gte('shift_date', start)
      .lte('shift_date', end)

    if (error) {
      console.error('[shiftsService.getMonthShifts]', error)
      return {}
    }

    const result: MonthShifts = {}
    data?.forEach((row: any) => {
      const sn: string = row.employee?.short_name
      if (!sn) return
      const day = new Date(row.shift_date + 'T00:00:00').getDate() - 1
      if (!result[sn]) result[sn] = Array(31).fill('') as ShiftType[]
      result[sn][day] = row.shift_type as ShiftType
    })

    cache[key] = result
    return result
  },

  async getEmployeeYearShifts(employeeId, year) {
    const { data } = await sb
      .from('shifts')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('shift_date', `${year}-01-01`)
      .lte('shift_date', `${year}-12-31`)
      .order('shift_date')
    return (data ?? []) as Shift[]
  },

  async saveShift(employeeShortName, date, type) {
    // Buscar employee_id por short_name
    let { data: emp } = await sb
      .from('employees').select('id').eq('short_name', employeeShortName).maybeSingle()
    if (!emp) {
      const { data: emp2 } = await sb
        .from('employees').select('id').eq('full_name', employeeShortName).maybeSingle()
      emp = emp2
    }
    if (!emp) throw new Error(`Empleado no encontrado: ${employeeShortName}`)

    const { error } = await sb
      .from('shifts')
      .upsert(
        { employee_id: emp.id, shift_date: date, shift_type: type },
        { onConflict: 'employee_id,shift_date' }
      )
    if (error) throw error

    // Invalidar caché del mes afectado
    const monthIdx = new Date(date + 'T00:00:00').getMonth()
    invalidateMonth(monthIdx)
  },

  async deleteShift(employeeId, date) {
    const { error } = await sb
      .from('shifts')
      .delete()
      .eq('employee_id', employeeId)
      .eq('shift_date', date)
    if (error) throw error

    const monthIdx = new Date(date + 'T00:00:00').getMonth()
    invalidateMonth(monthIdx)
  },
}

export default shiftsService
