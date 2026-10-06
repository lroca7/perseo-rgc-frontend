import { useEffect, useState } from 'react'
import { api, type ConfigGlobal, type Resumen } from '../api/client'
import { fmt } from '../lib/format'
import { useToast } from '../components/Shared'

export default function Config() {
  const [config, setConfig] = useState<ConfigGlobal | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [tasa, setTasa] = useState('5')
  const [ajusteBancos, setAjusteBancos] = useState('0')
  const [bancosObjetivo, setBancosObjetivo] = useState('')
  const toast = useToast()

  useEffect(() => {
    api.config.obtener().then((c) => { setConfig(c); setTasa(String(c.tasaDefault * 100)); setAjusteBancos(String(c.ajusteBancos)) })
    api.resumen.obtener().then(setResumen)
  }, [])

  const guardar = async () => {
    const c = await api.config.actualizar({ tasaDefault: Number(tasa) / 100, ajusteBancos: Number(ajusteBancos) || 0 })
    setConfig(c)
    api.resumen.obtener().then(setResumen)
    toast.show('Configuración guardada.')
  }

  const bancosSinAjuste = resumen ? resumen.bancos - (config?.ajusteBancos || 0) : null
  // Vista previa en vivo: usa el número que estás escribiendo, no el ya guardado
  const bancosConLoQueEscribes = bancosSinAjuste !== null ? bancosSinAjuste + (Number(ajusteBancos) || 0) : null
  const sinGuardar = config !== null && Number(ajusteBancos) !== config.ajusteBancos

  const calcularAjusteAutomatico = () => {
    if (bancosSinAjuste === null || !bancosObjetivo.trim()) { toast.show('Escribe primero el valor real de bancos (ej. el del Excel).'); return }
    const objetivo = Number(bancosObjetivo)
    const ajusteCalculado = objetivo - bancosSinAjuste
    setAjusteBancos(String(Math.round(ajusteCalculado * 100) / 100))
    toast.show('Ajuste calculado — revísalo abajo y dale Guardar para aplicarlo.')
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
        <h3>Ajuste manual de conciliación bancaria</h3>
        <div className="section-desc">
          La app calcula "Bancos" a partir de aportes, préstamos, intereses cobrados y gastos que ella misma conoce.
          Si al comparar con tu Excel (u otra fuente real) hay una diferencia — por ejemplo, intereses que ya se habían
          cobrado antes de migrar a esta app y que no quedaron con tabla de amortización — puedes registrar aquí esa
          diferencia una sola vez. Se suma tal cual a la fórmula de "Bancos" de ahí en adelante. Puede ser negativo.
        </div>
        <div className="form-grid" style={{ maxWidth: 420 }}>
          <div>
            <label>Bancos real (ej. el del Excel)</label>
            <input type="number" step="0.01" placeholder="2550735.00" value={bancosObjetivo} onChange={(e) => setBancosObjetivo(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn secondary" onClick={calcularAjusteAutomatico}>Calcular ajuste automáticamente</button>
          </div>
        </div>
        <div className="form-grid" style={{ maxWidth: 260 }}>
          <div><label>Ajuste (puede ser negativo)</label><input type="number" step="0.01" value={ajusteBancos} onChange={(e) => setAjusteBancos(e.target.value)} /></div>
        </div>
        {resumen && (
          <div className="hint" style={{ marginBottom: 10 }}>
            Bancos calculado sin ajuste: {fmt(bancosSinAjuste)}<br />
            Con el ajuste que estás escribiendo (sin guardar todavía): <strong>{fmt(bancosConLoQueEscribes)}</strong>
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
