import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Aporte, type Prestamo, type Socio } from '../api/client'
import { fmt, fmtPct, periodoLabel, todayISO } from '../lib/format'
import { Modal, Pill, Stat, useToast } from '../components/Shared'

export default function Socios() {
  const { id } = useParams()
  return id ? <SocioDetalle id={id} /> : <SociosLista />
}

function SociosLista() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [saldos, setSaldos] = useState<Record<string, { aportes: number; prestamo: number }>>({})
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const cargar = () => {
    setLoading(true)
    Promise.all([api.socios.listar(), api.resumen.obtener()])
      .then(([list, resumen]) => {
        setSocios(list)
        const map: Record<string, { aportes: number; prestamo: number }> = {}
        resumen.saldosPorSocio.forEach((s) => { map[s.socioId] = { aportes: s.aportes, prestamo: s.prestamoPendiente } })
        setSaldos(map)
      })
      .finally(() => setLoading(false))
  }
  useEffect(cargar, [])

  return (
    <>
      <div className="topbar">
        <div><h1>Socios</h1><div className="date">{socios.length} socios registrados</div></div>
        <button className="btn" onClick={() => setShowModal(true)}>+ Nuevo socio</button>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Estado</th><th className="num">Aportes</th><th className="num">Préstamo</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="empty">Cargando socios…</td></tr>}
              {!loading && socios.length === 0 && <tr><td colSpan={5} className="empty">Aún no hay socios.</td></tr>}
              {socios.map((s) => (
                <tr key={s.id}>
                  <td><Link className="socio-link" to={`/socios/${s.id}`}>{s.nombre}</Link></td>
                  <td><Pill kind={s.activo ? 'pos' : 'neg'}>{s.activo ? 'Activo' : 'Inactivo'}</Pill></td>
                  <td className="num">{fmt(saldos[s.id]?.aportes)}</td>
                  <td className="num">{fmt(saldos[s.id]?.prestamo)}</td>
                  <td><Link className="btn secondary small" to={`/socios/${s.id}`}>Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2>Nuevo socio</h2>
          <NuevoSocioForm onDone={() => { setShowModal(false); cargar(); toast.show('Socio agregado.') }} />
        </Modal>
      )}
    </>
  )
}

function NuevoSocioForm({ onDone }: { onDone: () => void }) {
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const guardar = async () => {
    if (!nombre.trim()) { toast.show('Escribe un nombre.'); return }
    setSaving(true)
    await api.socios.crear({ nombre, activo: true, fechaIngreso: fecha })
    onDone()
  }
  return (
    <>
      <div className="form-grid">
        <div><label>Nombre completo</label><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" /></div>
        <div><label>Fecha de ingreso</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
      </div>
      <button className="btn" disabled={saving} onClick={guardar}>Guardar</button>
    </>
  )
}

function SocioDetalle({ id }: { id: string }) {
  const [socio, setSocio] = useState<Socio | null>(null)
  const [aportes, setAportes] = useState<Aporte[]>([])
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [saldo, setSaldo] = useState<{ aportes: number; prestamo: number; utilidad: number } | null>(null)
  const [editModal, setEditModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const cargar = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.socios.obtener(id),
      api.aportes.listar(id),
      api.prestamos.listar(id),
      api.resumen.obtener(),
    ])
      .then(([socioData, aportesData, prestamosData, resumen]) => {
        setSocio(socioData)
        setAportes(aportesData)
        setPrestamos(prestamosData)
        const s = resumen.saldosPorSocio.find((x) => x.socioId === id)
        setSaldo(s ? { aportes: s.aportes, prestamo: s.prestamoPendiente, utilidad: s.utilidadRecibida } : null)
      })
      .catch(() => setError('No se pudo cargar la información del socio. Intenta de nuevo.'))
      .finally(() => setLoading(false))
  }
  useEffect(cargar, [id])

  if (loading) return <div className="empty">Cargando información del socio…</div>
  if (error) return (
    <div className="empty">
      {error} <button className="btn secondary small" onClick={cargar} style={{ marginLeft: 8 }}>Reintentar</button>
    </div>
  )
  if (!socio) return <div className="empty">Socio no encontrado.</div>
  const neto = (saldo?.aportes || 0) - (saldo?.prestamo || 0) + (saldo?.utilidad || 0)

  return (
    <>
      <div className="topbar"><button className="btn secondary small" onClick={() => navigate('/socios')}>← Socios</button></div>
      <div className="topbar">
        <div><h1>{socio.nombre}</h1><div className="date">{socio.activo ? 'Socio activo' : 'Socio inactivo'} · desde {socio.fechaIngreso}</div></div>
        <div className="row-actions">
          <button className="btn secondary small" onClick={() => setEditModal(true)}>Editar</button>
          <button className="btn danger small" onClick={async () => {
            if (!confirm(`¿Eliminar a ${socio.nombre}?`)) return
            await api.socios.eliminar(socio.id); navigate('/socios')
          }}>Eliminar</button>
        </div>
      </div>
      <div className="stats-row">
        <Stat label="Aportes" value={fmt(saldo?.aportes)} />
        <Stat label="Préstamo pendiente" value={fmt(saldo?.prestamo)} />
        <Stat label="Utilidad recibida" value={fmt(saldo?.utilidad)} kind="pos" />
        <Stat label="Saldo neto" value={fmt(neto)} kind={neto >= 0 ? 'pos' : 'neg'} />
      </div>
      <div className="card">
        <h2>Historial de aportes</h2>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Periodo</th><th>Fecha</th><th className="num">Monto</th><th>Nota</th></tr></thead>
            <tbody>
              {aportes.length === 0 && <tr><td colSpan={4} className="empty">Sin aportes registrados.</td></tr>}
              {aportes.map((a) => (
                <tr key={a.id}><td>{periodoLabel(a.periodo)}</td><td>{a.fecha}</td><td className="num">{fmt(a.monto)}</td><td className="hint">{a.nota}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>Préstamos</h2>
        {prestamos.length === 0 && <div className="empty">Sin préstamos.</div>}
        {prestamos.map((p) => (
          <div key={p.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{fmt(p.monto)}</strong>
              <Pill kind={p.estado === 'pagado' ? 'pos' : 'warn'}>{p.estado === 'pagado' ? 'Pagado' : 'Activo'}</Pill>
            </div>
            <div className="hint">Tasa {fmtPct(p.tasa)} mensual · {p.numCuotas} cuotas · inicio {p.fechaInicio} · <Link to={`/prestamos/${p.id}`}>ver detalle</Link></div>
          </div>
        ))}
      </div>
      {editModal && (
        <Modal onClose={() => setEditModal(false)}>
          <h2>Editar socio</h2>
          <EditarSocioForm socio={socio} onDone={() => { setEditModal(false); cargar(); toast.show('Socio actualizado.') }} />
        </Modal>
      )}
    </>
  )
}

function EditarSocioForm({ socio, onDone }: { socio: Socio; onDone: () => void }) {
  const [nombre, setNombre] = useState(socio.nombre)
  const [activo, setActivo] = useState(socio.activo)
  const guardar = async () => {
    await api.socios.actualizar(socio.id, { nombre, activo, fechaIngreso: socio.fechaIngreso })
    onDone()
  }
  return (
    <>
      <div className="form-grid">
        <div><label>Nombre completo</label><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
        <div>
          <label>Estado</label>
          <select value={String(activo)} onChange={(e) => setActivo(e.target.value === 'true')}>
            <option value="true">Activo</option><option value="false">Inactivo</option>
          </select>
        </div>
      </div>
      <button className="btn" onClick={guardar}>Guardar</button>
    </>
  )
}
