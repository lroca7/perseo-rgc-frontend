import { useEffect, useState } from 'react'
import { api, type ConfigGlobal, type Resumen } from '../api/client'
import { fmt } from '../lib/format'
import { useToast } from '../components/Shared'

export default function Config() {
  const [config, setConfig] = useState<ConfigGlobal | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [tasa, setTasa] = useState('5')
  const [ajuste, setAjuste] = useState('0')
  const [bancosObjetivo, setBancosObjetivo] = useState('')
  const [utilidadObjetivo, setUtilidadObjetivo] = useState('')
  const toast = useToast()

  useEffect(() => {
    api.config.obtener().then((c) => { setConfig(c); setTasa(String(c.tasaDefault * 100)); setAjuste(String(c.ajusteInteresesHistoricos)) })
    api.resumen.obtener().then(setResumen)
  }, [])

  const guardar = async () => {
    const c = await api.config.actualizar({ tasaDefault: Number(tasa) / 100, ajusteInteresesHistoricos: Number(ajuste) || 0 })
    setConfig(c)
    api.resumen.obtener().then(setResumen)
    toast.show('Configuración guardada.')
  }

  // Los valores "sin ajuste" se calculan restando el ajuste YA guardado (config.ajusteInteresesHistoricos)
  // del valor que ya trae el resumen (que incluye ese mismo ajuste guardado).
  const ajusteGuardado = config?.ajusteInteresesHistoricos || 0
  const bancosSinAjuste = resumen ? resumen.bancos - ajusteGuardado : null
  const utilidadSinAjuste = resumen ? resumen.utilidadSinLiquidar - ajusteGuardado : null

  // Vista previa en vivo: usa el número que estás escribiendo en el campo de ajuste, sin guardar todavía
  const ajusteEnPantalla = Number(ajuste) || 0
  const bancosConLoQueEscribes = bancosSinAjuste !== null ? bancosSinAjuste + ajusteEnPantalla : null
  const utilidadConLoQueEscribes = utilidadSinAjuste !== null ? utilidadSinAjuste + ajusteEnPantalla : null
  const sinGuardar = config !== null && ajusteEnPantalla !== config.ajusteInteresesHistoricos

  const calcularDesdeBancos = () => {
    if (bancosSinAjuste === null || !bancosObjetivo.trim()) { toast.show('Escribe primero el valor real de bancos (ej. el del Excel).'); return }
    setAjuste(String(Math.round((Number(bancosObjetivo) - bancosSinAjuste) * 100) / 100))
    toast.show('Ajuste calculado desde Bancos — revísalo abajo y dale Guardar.')
  }
  const calcularDesdeUtilidad = () => {
    if (utilidadSinAjuste === null || !utilidadObjetivo.trim()) { toast.show('Escribe primero la utilidad real (ej. la del Excel).'); return }
    setAjuste(String(Math.round((Number(utilidadObjetivo) - utilidadSinAjuste) * 100) / 100))
    toast.show('Ajuste calculado desde Utilidad — revísalo abajo y dale Guardar.')
  }

  return (
    <>
      <div className="topbar"><div><h1>Configuración</h1><div className="date">Parámetros generales del fondo</div></div></div>
      <div className="card">
        <h2>Parámetros generales</h2>
        <h3>Tasa de interés por defecto</h3>
        <div className="section-desc">Se usa como valor sugerido al crear un préstamo nuevo (editable en cada préstamo).</div>
        <div className="form-grid" style={{ maxWidth: 220 }}>
          <div><label>Tasa mensual (%)</label><input type="number" step="0.01" value={tasa} onChange={(e) => setTasa(e.target.value)} /></div>
        </div>

        <h3>Ajuste de intereses históricos no registrados</h3>
        <div className="section-desc">
          La app calcula "Bancos" y "Utilidad sin liquidar" a partir de aportes, préstamos, cuotas realmente pagadas y
          gastos. Si vienes de un Excel (u otra fuente) donde ya se habían cobrado intereses que en la app no quedaron
          como cuotas pagadas (por ejemplo, préstamos migrados sin tabla completa), regístralo aquí <strong>una sola vez</strong>.
          Este mismo número alimenta ambos indicadores — no hay que ajustarlos por separado. No afecta la liquidación
          mes a mes, que siempre se calcula solo con cuotas reales.
        </div>

        <div className="form-grid" style={{ maxWidth: 420 }}>
          <div>
            <label>Bancos real (ej. el del Excel)</label>
            <input type="number" step="0.01" placeholder="2550735.00" value={bancosObjetivo} onChange={(e) => setBancosObjetivo(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn secondary" onClick={calcularDesdeBancos}>Calcular ajuste desde Bancos</button>
          </div>
        </div>
        <div className="form-grid" style={{ maxWidth: 420 }}>
          <div>
            <label>Utilidad real (ej. la del Excel)</label>
            <input type="number" step="0.01" placeholder="3215633.00" value={utilidadObjetivo} onChange={(e) => setUtilidadObjetivo(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn secondary" onClick={calcularDesdeUtilidad}>Calcular ajuste desde Utilidad</button>
          </div>
        </div>

        <div className="form-grid" style={{ maxWidth: 260 }}>
          <div><label>Ajuste (puede ser negativo)</label><input type="number" step="0.01" value={ajuste} onChange={(e) => setAjuste(e.target.value)} /></div>
        </div>

        {resumen && (
          <div className="hint" style={{ marginBottom: 10 }}>
            Sin ajuste — Bancos: {fmt(bancosSinAjuste)} · Utilidad: {fmt(utilidadSinAjuste)}<br />
            Con el ajuste que estás escribiendo (sin guardar todavía) — Bancos: <strong>{fmt(bancosConLoQueEscribes)}</strong> · Utilidad: <strong>{fmt(utilidadConLoQueEscribes)}</strong>
            {sinGuardar && <span style={{ color: 'var(--gold)' }}> — dale Guardar para que quede así</span>}
          </div>
        )}
        <button className="btn" onClick={guardar}>Guardar</button>
      </div>
      <div className="card">
        <h2>Estado de conexión</h2>
        <p className="hint">
          {config ? 'Conectado a MongoDB Atlas — tus datos se guardan automáticamente y persisten entre sesiones.' : 'Cargando estado de conexión…'}
        </p>
      </div>
    </>
  )
}
