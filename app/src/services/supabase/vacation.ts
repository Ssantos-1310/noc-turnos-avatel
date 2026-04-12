import { sb } from './client'
import type { VacationService } from '../index'
import type { VacationBalance } from '../../types'

const vacationService: VacationService = {
  async getBalance(employeeId, year) {
    const { data } = await sb
      .from('vacation_balance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .maybeSingle()
    return (data as VacationBalance) ?? null
  },
}

export default vacationService
