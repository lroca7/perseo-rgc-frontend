import { NavLink } from 'react-router-dom'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const NAV = [
  { to: '/', label: 'Resumen', icon: '◆' },
  { to: '/socios', label: 'Socios', icon: '◍' },
  { to: '/aportes', label: 'Aportes', icon: '▤' },
  { to: '/prestamos', label: 'Préstamos', icon: '◈' },
  { to: '/gastos', label: 'Gastos', icon: '▽' },
  { to: '/utilidades', label: 'Utilidades', icon: '✦' },
  { to: '/proyeccion', label: 'Proyección', icon: '↗' },
  { to: '/config', label: 'Configuración', icon: '⚙' },
]

export function Sidebar() {
  return (
    <div className="sidebar">
      <div className="brand">
        <div className="mark">R.G.C. Inversiones</div>
        <div className="sub">Fondo de socios</div>
      </div>
      <div className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

// ---------- Toast ----------
type ToastCtx = { show: (msg: string) => void }
const ToastContext = createContext<ToastCtx>({ show: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const show = useCallback((m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3200)
  }, [])
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastContext.Provider>
  )
}

// ---------- Modal ----------
export function Modal({
  onClose,
  children,
}: {
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">{children}</div>
    </div>
  )
}

export function Pill({ kind, children }: { kind: 'pos' | 'neg' | 'warn'; children: ReactNode }) {
  return <span className={`pill ${kind}`}>{children}</span>
}

export function Stat({ label, value, kind }: { label: string; value: string; kind?: 'pos' | 'neg' }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className={`value ${kind || ''}`}>{value}</div>
    </div>
  )
}
