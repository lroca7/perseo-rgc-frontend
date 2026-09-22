import { useEffect, useState } from 'react'
import { api, type Aporte, type Socio } from '../api/client'
import { fmt, periodoActual, periodoLabel, todayISO } from '../lib/format'
import { Modal, useToast } from '../components/Shared'

export default function Aportes() {
  const [aportes, setAportes] = useState<Aporte[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [showModal, setShowModal] = useState(false)
  const toast = useToast()

  const cargar = () => {
    api.aportes.listar().then((list) => setAportes([...list].sort((a, b) => b.fecha.localeCompare(a.fecha))))
    api.socios.listar().then(setSocios)
  }
  useEffect(cargar, [])

  const nombreDe = (id: string) => socios.find((s) => s.id === id)?.nombre || '(socio eliminado)'
  const total = aportes.reduce((s, a) => s + a.monto, 0)

  return (
    <>
      <div className="topbar">
        <div><h1>Aportes mensuales</h1><div className="date">Total acumulado: {fmt(total)}</div></div>
        <button className="btn" onClick={() => setShowModal(true)}>+ Registrar aporte</button>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Socio</th><th>Periodo</th><th>Fecha</th><th className="num">Monto</th><th>Nota</th><th></th></tr></thead>
            <tbody>
              {aportes.length === 0 && <tr><td colSpan={6} className="empty">No hay aportes registrados aún.</td></tr>}
              {aportes.map((a) => (
                <tr key={a.id}>
                  <td>{nombreDe(a.socioId)}</td><td>{periodoLabel(a.periodo)}</td><td>{a.fecha}</td>
                  <td className="num">{fmt(a.monto)}</td><td className="hint">{a.nota}</td>
                  <td><button className="btn secondary small" onClick={async () => {
                    if (!confirm('¿Eliminar este aporte?')) return
                    await api.aportes.eliminar(a.id); cargar(); toast.show('Aporte eliminado.')
                  }}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <NuevoAporteForm socios={socios} onDone={() => { setShowModal(false); cargar(); toast.show('Aporte registrado.') }} />
        </Modal>
      )}
    </>
  )
}

function NuevoAporteForm({ socios, onDone }: { socios: Socio[]; onDone: () => void }) {
  const [socioId, setSocioId] = useState(socios[0]?.id || '')
  const [periodo, setPeriodo] = useState(periodoActual())
  const [fecha, setFecha] = useState(todayISO())
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const toast = useToast()

  const guardar = async () => {
    const m = Number(monto)
    if (!m || m <= 0) { toast.show('Ingresa un monto válido.'); return }
    await api.aportes.crear({ socioId, periodo, fecha, monto: m, nota })
    onDone()
  }

  if (socios.length === 0) return <div className="empty">Primero crea al menos un socio.</div>

  return (
    <>
      <h2>Registrar aporte</h2>
      <div className="form-grid">
        <div><label>Socio</label>
          <select value={socioId} onChange={(e) => setSocioId(e.target.value)}>
            {socios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div><label>Periodo</label><input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></div>
        <div><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div><label>Monto</label><input type="number" placeholder="200000" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
      </div>
      <label>Nota (opcional)</label>
      <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: consignación banco" />
      <div style={{ marginTop: 14 }}><button className="btn" onClick={guardar}>Guardar</button></div>
    </>
  )
}
