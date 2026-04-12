import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { Login } from './views/Login'
import type { Employee } from './types'

// ── Vista de carga ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="login-wrap">
      <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>📡</div>
        <div>Cargando…</div>
      </div>
    </div>
  )
}

// ── Vista temporal (placeholder hasta extraer vistas reales) ───────────────────
function PlaceholderView({ label }: { label: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
      <p style={{ color: 'var(--text2)', fontSize: 13 }}>
        Vista <strong style={{ color: 'var(--text)' }}>{label}</strong> — en migración
      </p>
      <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>
        Esta vista se está migrando desde la app monolítica.
      </p>
    </div>
  )
}

// ── Tipos de vistas ───────────────────────────────────────────────────────────
type View =
  | 'dashboard'
  | 'calendar'
  | 'requests'
  | 'employees'
  | 'coverage'
  | 'n2'
  | 'profile'

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface SidebarProps {
  user: Employee
  view: View
  onView: (v: View) => void
  onSignOut: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

function Sidebar({ user, view, onView, onSignOut, theme, onToggleTheme }: SidebarProps) {
  const isAdmin = user.role === 'admin' || user.role === 'manager'
  const initials = user.short_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)

  type NavItem = { id: View; icon: string; label: string; adminOnly?: boolean }

  const navItems: NavItem[] = [
    { id: 'dashboard', icon: '◉', label: 'Dashboard' },
    { id: 'calendar', icon: '▦', label: 'Cuadrante' },
    { id: 'requests', icon: '⇄', label: 'Solicitudes' },
    { id: 'employees', icon: '☰', label: 'Empleados', adminOnly: true },
    { id: 'coverage', icon: '⛊', label: 'Cobertura', adminOnly: true },
    { id: 'n2', icon: '★', label: 'Guardia N2', adminOnly: true },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>NOC Turnos</h1>
        <span>Avatel · 2026</span>
      </div>

      <nav className="nav">
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null
          return (
            <div
              key={item.id}
              className={`nav-item${view === item.id ? ' active' : ''}`}
              onClick={() => onView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-user-av">
            {user.photo_url
              ? <img src={user.photo_url} alt={user.short_name} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name">{user.short_name}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
        </div>
        <div className="sidebar-user-actions">
          <div
            className="nav-item"
            onClick={() => onView('profile')}
            title="Mi perfil"
          >
            👤 Perfil
          </div>
          <div
            className="nav-item"
            onClick={onToggleTheme}
            title="Cambiar tema"
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </div>
          <div
            className="nav-item"
            onClick={onSignOut}
            title="Cerrar sesión"
          >
            ⏻
          </div>
        </div>
      </div>
    </div>
  )
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, error, signIn, signOut, clearError } = useAuth()
  const [view, setView] = useState<View>('dashboard')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Sincronizar tema con body
  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.body.classList.toggle('light-theme', next === 'light')
      return next
    })
  }

  if (loading) return <LoadingScreen />

  if (!user) {
    return (
      <Login
        onLogin={async (email, password) => {
          clearError()
          await signIn(email, password)
        }}
        error={error}
      />
    )
  }

  const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    calendar: 'Cuadrante de Turnos',
    requests: 'Solicitudes',
    employees: 'Empleados',
    coverage: 'Reglas de Cobertura',
    n2: 'Guardia N2',
    profile: 'Mi Perfil',
  }

  return (
    <div className="app">
      <Sidebar
        user={user}
        view={view}
        onView={setView}
        onSignOut={signOut}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{viewTitles[view]}</span>
        </div>
        <div className="content">
          <PlaceholderView label={viewTitles[view]} />
        </div>
      </div>
    </div>
  )
}
