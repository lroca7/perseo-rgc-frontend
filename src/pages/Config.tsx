import { useEffect, useState } from 'react'
import { api, type ConfigGlobal } from '../api/client'
import { useToast } from '../components/Shared'

export default function Config() {
  const [config, setConfig] = useState<ConfigGlobal | null>(null)
  const [tasa, setTasa] = useState('5')
  const toast = useToast()

  useEffect(() => {
    api.config.obtener().then((c) => { setConfig(c); setTasa(String(c.tasaDefault * 100)) })
  }, [])

  const guardar = async () => {
    const c = await api.config.actualizar(Number(tasa) / 100)
    setConfig(c)
    toast.show('Configuración guardada.')
  }

  return (
    <>
      <div className="topbar"><div><h1>Configuración</h1><div className="date">Parámetros generales del fondo</div></div></div>
      <div className="card">
        <h2>Tasa de interés por defecto</h2>
        <div className="section-desc">Se usa como valor sugerido al crear un préstamo nuevo (editable en cada préstamo).</div>
        <div className="form-grid" style={{ maxWidth: 220 }}>
          <div><label>Tasa mensual (%)</label><input type="number" step="0.01" value={tasa} onChange={(e) => setTasa(e.target.value)} /></div>
        </div>
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
