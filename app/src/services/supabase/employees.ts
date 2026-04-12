import { sb } from './client'
import type { EmployeesService } from '../index'
import type { Employee } from '../../types'

const employeesService: EmployeesService = {
  async getAll() {
    const { data } = await sb
      .from('employees')
      .select('*')
      .eq('active', true)
      .order('full_name')
    return (data ?? []) as Employee[]
  },

  async updateProfile(employeeId, data) {
    const { error } = await sb
      .from('employees')
      .update(data)
      .eq('id', employeeId)
    if (error) throw error
  },

  async uploadAvatar(file, authUserId) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${authUserId}/avatar.${ext}`

    const { error } = await sb.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error

    const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path)
    // Cache-bust para refrescar la imagen en el navegador
    return `${publicUrl}?t=${Date.now()}`
  },
}

export default employeesService
