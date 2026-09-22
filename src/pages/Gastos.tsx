import { useEffect, useState } from 'react'
import { api, type Gasto } from '../api/client'
import { fmt, periodoActual, periodoLabel, todayISO } from '../lib/format'
import { Modal, useToast } from '../components/Shared'

export default function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [showModal, setShowModal] = useState(false)
  const toast = useToast()

  const cargar = () => {
    api.gastos.listar().then((list) => setGastos([...list].sort((a, b) => b.fecha.localeCompare(a.fecha))))
  }
  useEffect(cargar, [])

  const total = gastos.reduce((s, g) => s + g.monto, 0)

  return (
    <>
      <div className="topbar">
        <div><h1>Gastos</h1><div className="date">Total acumulado: {fmt(total)}</div></div>
        <button className="btn" onClick={() => setShowModal(true)}>+ Registrar gasto</button>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Concepto</th><th>Periodo</th><th>Fecha</th><th className="num">Monto</th><th></th></tr></thead>
            <tbody>
              {gastos.length === 0 && <tr><td colSpan={5} className="empty">No hay gastos registrados.</td></tr>}
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td>{g.concepto}</td><td>{periodoLabel(g.periodo)}</td><td>{g.fecha}</td>
                  <td className="num">{fmt(g.monto)}</td>
                  <td><button className="btn secondary small" onClick={async () => {
                    if (!confirm('¿Eliminar este gasto?')) return
                    await api.gastos.eliminar(g.id); cargar(); toast.show('Gasto eliminado.')
                  }}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <NuevoGastoForm onDone={() => { setShowModal(false); cargar(); toast.show('Gasto registrado.') }} />
        </Modal>
      )}
    </>
  )
}

function NuevoGastoForm({ onDone }: { onDone: () => void }) {
  const [concepto, setConcepto] = useState('')
  const [periodo, setPeriodo] = useState(periodoActual())
  const [fecha, setFecha] = useState(todayISO())
  const [monto, setMonto] = useState('')
  const toast = useToast()

  const guardar = async () => {
    const m = Number(monto)
    if (!concepto.trim() || !m) { toast.show('Completa concepto y monto.'); return }
    await api.gastos.crear({ concepto, periodo, fecha, monto: m })
    onDone()
  }

  return (
    <>
      <h2>Registrar gasto</h2>
      <div className="form-grid">
        <div><label>Concepto</label><input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: atención asamblea" /></div>
        <div><label>Periodo</label><input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></div>
        <div><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div><label>Monto</label><input type="number" placeholder="115299" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
      </div>
      <button className="btn" onClick={guardar}>Guardar</button>
    </>
  )
}
