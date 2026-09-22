import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Prestamo, type Socio } from '../api/client'
import { fmt, fmtPct, todayISO } from '../lib/format'
import { Modal, Pill, Stat, useToast } from '../components/Shared'

export default function Prestamos() {
  const { id } = useParams()
  return id ? <PrestamoDetalle id={id} /> : <PrestamosLista />
}

function PrestamosLista() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const cargar = () => {
    api.prestamos.listar().then(setPrestamos)
    api.socios.listar().then(setSocios)
  }
  useEffect(cargar, [])

  const nombreDe = (id: string) => socios.find((s) => s.id === id)?.nombre || '(socio eliminado)'
  const saldoPendiente = (p: Prestamo) => {
    if (!p.cuotas.length) return p.monto
    const idx = p.cuotas.findIndex((c) => !c.pagado)
    if (idx === -1) return 0
    return idx === 0 ? p.monto : p.cuotas[idx - 1].saldo
  }
  const totalPendiente = prestamos.reduce((s, p) => s + (p.estado === 'pagado' ? 0 : saldoPendiente(p)), 0)

  return (
    <>
      <div className="topbar">
        <div><h1>Préstamos</h1><div className="date">Pendiente por cobrar: {fmt(totalPendiente)}</div></div>
        <button className="btn" onClick={() => setShowModal(true)}>+ Nuevo préstamo</button>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Socio</th><th className="num">Monto original</th><th>Tasa</th><th className="num">Saldo pendiente</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {prestamos.length === 0 && <tr><td colSpan={6} className="empty">No hay préstamos registrados.</td></tr>}
              {prestamos.map((p) => (
                <tr key={p.id}>
                  <td>{nombreDe(p.socioId)}</td><td className="num">{fmt(p.monto)}</td><td>{fmtPct(p.tasa)}</td>
                  <td className="num">{fmt(saldoPendiente(p))}</td>
                  <td><Pill kind={p.estado === 'pagado' ? 'pos' : 'warn'}>{p.estado === 'pagado' ? 'Pagado' : 'Activo'}</Pill></td>
                  <td><button className="btn secondary small" onClick={() => navigate(`/prestamos/${p.id}`)}>Ver / gestionar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <NuevoPrestamoForm socios={socios} onDone={() => { setShowModal(false); cargar(); toast.show('Préstamo creado con su tabla de amortización.') }} />
        </Modal>
      )}
    </>
  )
}

function NuevoPrestamoForm({ socios, onDone }: { socios: Socio[]; onDone: () => void }) {
  const [socioId, setSocioId] = useState(socios[0]?.id || '')
  const [monto, setMonto] = useState('')
  const [tasa, setTasa] = useState('5')
  const [numCuotas, setNumCuotas] = useState('18')
  const [fechaInicio, setFechaInicio] = useState(todayISO())
  const [aplicarGracia, setAplicarGracia] = useState(true)
  const toast = useToast()

  const guardar = async () => {
    const m = Number(monto), t = Number(tasa) / 100, n = Number(numCuotas)
    if (!m || m <= 0) { toast.show('Ingresa un monto válido.'); return }
    if (!n || n <= 0) { toast.show('Ingresa un número de cuotas válido.'); return }
    await api.prestamos.crear({ socioId, monto: m, tasa: t, numCuotas: n, fechaInicio, aplicarGraciaDiciembre: aplicarGracia })
    onDone()
  }

  if (socios.length === 0) return <div className="empty">Primero crea al menos un socio.</div>

  return (
    <>
      <h2>Nuevo préstamo</h2>
      <div className="form-grid">
        <div><label>Socio</label>
          <select value={socioId} onChange={(e) => setSocioId(e.target.value)}>
            {socios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div><label>Monto</label><input type="number" placeholder="6000000" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
        <div><label>Tasa de interés mensual (%)</label><input type="number" step="0.01" value={tasa} onChange={(e) => setTasa(e.target.value)} /></div>
        <div><label>N° de cuotas</label><input type="number" value={numCuotas} onChange={(e) => setNumCuotas(e.target.value)} /></div>
        <div><label>Fecha de inicio</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={aplicarGracia} onChange={(e) => setAplicarGracia(e.target.checked)} />
        Aplicar mes de gracia en diciembre (no se cobra cuota ni interés ese mes)
      </label>
      <div className="hint">La cuota fija y la tabla de amortización se generan automáticamente (método francés). Las {numCuotas} cuotas son las que realmente cobran; si el préstamo atraviesa uno o más diciembres, el calendario se alarga por esos meses de gracia.</div>
      <div style={{ marginTop: 14 }}><button className="btn" onClick={guardar}>Crear préstamo</button></div>
    </>
  )
}

function PrestamoDetalle({ id }: { id: string }) {
  const [prestamo, setPrestamo] = useState<Prestamo | null>(null)
  const [socios, setSocios] = useState<Socio[]>([])
  const [showRefi, setShowRefi] = useState(false)
  const [pagarIdx, setPagarIdx] = useState<number | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const cargar = () => {
    api.prestamos.obtener(id).then(setPrestamo)
    api.socios.listar().then(setSocios)
  }
  useEffect(cargar, [id])

  if (!prestamo) return <div className="empty">Cargando…</div>
  const nombreDe = (sid: string) => socios.find((s) => s.id === sid)?.nombre || '(socio eliminado)'
  const saldoPendiente = () => {
    if (!prestamo.cuotas.length) return prestamo.monto
    const idx = prestamo.cuotas.findIndex((c) => !c.pagado)
    if (idx === -1) return 0
    return idx === 0 ? prestamo.monto : prestamo.cuotas[idx - 1].saldo
  }
  const pendienteN = prestamo.cuotas.findIndex((c) => !c.pagado)
  const tieneTabla = prestamo.cuotas.length > 0

  const eliminarTabla = async () => {
    if (!confirm('¿Eliminar la tabla de amortización de este préstamo? Podrás generar una nueva desde cero.')) return
    try {
      await api.prestamos.eliminarTabla(prestamo.id)
      cargar(); toast.show('Tabla de amortización eliminada.')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo eliminar la tabla.')
    }
  }

  return (
    <>
      <div className="topbar"><button className="btn secondary small" onClick={() => navigate('/prestamos')}>← Préstamos</button></div>
      <div className="topbar">
        <div><h1>Préstamo de {nombreDe(prestamo.socioId)}</h1><div className="date">{fmt(prestamo.monto)} · tasa {fmtPct(prestamo.tasa)} mensual · inicio {prestamo.fechaInicio}</div></div>
        <div className="row-actions">
          <button className="btn secondary small" onClick={() => setShowRefi(true)}>{tieneTabla ? 'Editar / regenerar tabla' : 'Generar tabla de amortización'}</button>
          {tieneTabla && <button className="btn secondary small" onClick={eliminarTabla}>Eliminar tabla</button>}
          <button className="btn danger small" onClick={async () => {
            if (!confirm('¿Eliminar este préstamo por completo?')) return
            await api.prestamos.eliminar(prestamo.id); navigate('/prestamos')
          }}>Eliminar préstamo</button>
        </div>
      </div>
      <div className="stats-row">
        <Stat label="Saldo pendiente" value={fmt(saldoPendiente())} />
        <Stat label="Estado" value={prestamo.estado === 'pagado' ? 'Pagado' : 'Activo'} />
      </div>
      {tieneTabla ? (
        <div className="card">
          <h2>Tabla de amortización</h2>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Cuota</th><th>Fecha</th><th className="num">Valor cuota</th><th className="num">Interés</th><th className="num">Capital</th><th className="num">Saldo</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {prestamo.cuotas.map((c, idx) => (
                  <tr key={c.numero} style={c.esGracia ? { opacity: 0.7 } : undefined}>
                    <td>{c.numero}</td><td>{c.fechaProgramada}</td>
                    <td className="num">{fmt(c.cuota)}</td><td className="num">{fmt(c.interes)}</td><td className="num">{fmt(c.capital)}</td><td className="num">{fmt(c.saldo)}</td>
                    <td>{c.esGracia
                      ? <Pill kind="warn">Mes de gracia</Pill>
                      : <Pill kind={c.pagado ? 'pos' : 'warn'}>{c.pagado ? `Pagada ${c.fechaPago || ''}` : 'Pendiente'}</Pill>}
                    </td>
                    <td>{!c.pagado && idx === pendienteN && <button className="btn small" onClick={() => setPagarIdx(idx)}>Registrar pago</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card"><div className="empty">Este préstamo aún no tiene tabla de amortización. {prestamo.nota}</div></div>
      )}
      {showRefi && (
        <Modal onClose={() => setShowRefi(false)}>
          <GenerarTablaForm prestamo={prestamo} onDone={() => { setShowRefi(false); cargar(); toast.show('Tabla de amortización generada.') }} onError={(m) => toast.show(m)} />
        </Modal>
      )}
      {pagarIdx !== null && (
        <Modal onClose={() => setPagarIdx(null)}>
          <PagarCuotaForm prestamo={prestamo} idx={pagarIdx} onDone={() => { setPagarIdx(null); cargar(); toast.show('Pago registrado.') }} />
        </Modal>
      )}
    </>
  )
}

function GenerarTablaForm({ prestamo, onDone, onError }: { prestamo: Prestamo; onDone: () => void; onError: (msg: string) => void }) {
  const [tasa, setTasa] = useState(String(prestamo.tasa * 100))
  const [numCuotas, setNumCuotas] = useState(String(prestamo.numCuotas || 18))
  const [fechaInicio, setFechaInicio] = useState(todayISO())
  const [aplicarGracia, setAplicarGracia] = useState(true)
  const tieneTabla = prestamo.cuotas.length > 0

  const guardar = async () => {
    try {
      await api.prestamos.generarTabla(prestamo.id, {
        tasa: Number(tasa) / 100, numCuotas: Number(numCuotas), fechaInicio, aplicarGraciaDiciembre: aplicarGracia,
      })
      onDone()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo generar la tabla.')
    }
  }

  return (
    <>
      <h2>{tieneTabla ? 'Editar / regenerar tabla de amortización' : 'Generar tabla de amortización'}</h2>
      <div className="section-desc">
        {tieneTabla
          ? 'Esto recalcula toda la tabla desde el saldo pendiente actual. Solo funciona si aún no hay cuotas reales pagadas.'
          : `Para el saldo actual pendiente: ${fmt(prestamo.monto)}`}
      </div>
      <div className="form-grid">
        <div><label>Tasa mensual (%)</label><input type="number" step="0.01" value={tasa} onChange={(e) => setTasa(e.target.value)} /></div>
        <div><label>N° de cuotas</label><input type="number" value={numCuotas} onChange={(e) => setNumCuotas(e.target.value)} /></div>
        <div><label>Fecha de inicio</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={aplicarGracia} onChange={(e) => setAplicarGracia(e.target.checked)} />
        Aplicar mes de gracia en diciembre
      </label>
      <button className="btn" onClick={guardar}>{tieneTabla ? 'Regenerar' : 'Generar'}</button>
    </>
  )
}

function PagarCuotaForm({ prestamo, idx, onDone }: { prestamo: Prestamo; idx: number; onDone: () => void }) {
  const c = prestamo.cuotas[idx]
  const [fechaPago, setFechaPago] = useState(todayISO())
  const [monto, setMonto] = useState(String(c.cuota))
  const guardar = async () => {
    await api.prestamos.pagarCuota(prestamo.id, c.numero, { fechaPago, montoPagado: Number(monto) })
    onDone()
  }
  return (
    <>
      <h2>Registrar pago — Cuota {c.numero}</h2>
      <div className="section-desc">Programada: {fmt(c.cuota)} (interés {fmt(c.interes)} + capital {fmt(c.capital)})</div>
      <div className="form-grid">
        <div><label>Fecha de pago</label><input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} /></div>
        <div><label>Monto pagado</label><input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
      </div>
      <button className="btn" onClick={guardar}>Confirmar pago</button>
    </>
  )
}
