import { useState, useEffect, useCallback } from 'react'
import type { Employee } from '../types'
import { authService } from '../services'

interface AuthState {
  user: Employee | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  // Restore session on mount
  useEffect(() => {
    authService.getCurrentEmployee()
      .then(emp => setState({ user: emp, loading: false, error: null }))
      .catch(() => setState({ user: null, loading: false, error: null }))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const emp = await authService.signIn(email, password)
      setState({ user: emp, loading: false, error: null })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión'
      setState(s => ({ ...s, loading: false, error: msg }))
      throw e
    }
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setState({ user: null, loading: false, error: null })
  }, [])

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
  }, [])

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAdmin: state.user?.role === 'admin' || state.user?.role === 'manager',
    signIn,
    signOut,
    clearError,
  }
}
