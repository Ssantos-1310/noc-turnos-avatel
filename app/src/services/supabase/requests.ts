import { sb } from './client'
import type { RequestsService } from '../index'
import type { ShiftRequest } from '../../types'
const SELECT_FIELDS = `
  id, request_type, status, created_at, resolved_at, resolver_notes,
  requester_date, target_date, vacation_start, vacation_end, vacation_year, notes,
  requester:requester_id(id, full_name, short_name),
  target:target_id(id, full_name, short_name)
`

const requestsService: RequestsService = {
  async getPendingRequests() {
    const { data } = await sb
      .from('shift_requests')
      .select(SELECT_FIELDS)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return (data ?? []) as unknown as ShiftRequest[]
  },

  async getEmployeeRequests(employeeId, limit = 20) {
    const { data } = await sb
      .from('shift_requests')
      .select(SELECT_FIELDS)
      .eq('requester_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as unknown as ShiftRequest[]
  },

  async createRequest(req) {
    const { error } = await sb.from('shift_requests').insert({
      ...req,
      status: 'pending',
    })
    if (error) throw error
  },

  async approveRequest(requestId) {
    const { error } = await sb
      .from('shift_requests')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', requestId)
    if (error) throw error
  },

  async rejectRequest(requestId, notes) {
    const { error } = await sb
      .from('shift_requests')
      .update({ status: 'rejected', resolved_at: new Date().toISOString(), resolver_notes: notes ?? null })
      .eq('id', requestId)
    if (error) throw error
  },

  async cancelRequest(requestId) {
    const { error } = await sb
      .from('shift_requests')
      .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
      .eq('id', requestId)
    if (error) throw error
  },
}

export default requestsService
