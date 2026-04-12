import { useState, type FormEvent } from 'react'

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>
  error: string | null
}

export function Login({ onLogin, error }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      await onLogin(email, password)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-icon">📡</div>
          <h1>NOC Turnos</h1>
          <p>Avatel · Centro de Operaciones</p>
        </div>

        {error && (
          <div className="login-err">⚠ {error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="fl" htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              className="fi"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@avatel.es"
              autoComplete="email"
              required
            />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="fi"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: 14 }}
          >
            {loading ? 'Iniciando sesión…' : 'Entrar'}
          </button>
        </form>

        <p className="login-hint">Solo personal autorizado de Avatel</p>
      </div>
    </div>
  )
}
