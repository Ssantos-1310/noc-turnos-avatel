import { sb } from './client'
import type { N2Service } from '../index'
import type { N2Assignment } from '../../types'

const n2Service: N2Service = {
  async getAssignments(year) {
    const { data } = await sb
      .from('n2_assignments')
      .select('*, employee:employee_id(short_name, full_name)')
      .eq('year', year)
      .order('week_number')
    return (data ?? []) as N2Assignment[]
  },
  async saveAssignment(assignment) {
    const { error } = await sb.from('n2_assignments').insert(assignment)
    if (error) throw error
  },
}

export default n2Service
