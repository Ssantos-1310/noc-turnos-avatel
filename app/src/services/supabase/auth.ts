import { sb } from './client'
import type { AuthService } from '../index'
import type { Employee } from '../../types'

const authService: AuthService = {
  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error('Credenciales incorrectas')

    const { data: emp } = await sb
      .from('employees')
      .select('*')
      .eq('auth_id', data.user.id)
      .eq('active', true)
      .maybeSingle()

    if (!emp) {
      await sb.auth.signOut()
      throw new Error('Perfil de empleado no encontrado')
    }
    return emp as Employee
  },

  async signOut() {
    await sb.auth.signOut()
  },

  async getCurrentEmployee() {
    const { data: { session } } = await sb.auth.getSession()
    if (!session?.user) return null

    const { data: emp } = await sb
      .from('employees')
      .select('*')
      .eq('auth_id', session.user.id)
      .eq('active', true)
      .maybeSingle()

    return (emp as Employee) ?? null
  },
}

export default authService
