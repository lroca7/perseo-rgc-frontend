import { useEffect, useState } from 'react'
import { api, type Socio, type Utilidad, type UtilidadPeriodo } from '../api/client'
import { fmt, periodoActual, periodoLabel } from '../lib/format'
import { Stat, useToast } from '../components/Shared'

export default function Utilidades() {
  const [periodo, setPeriodo] = useState(periodoActual())
  const [propuesta, setPropuesta] = useState<UtilidadPeriodo | null>(null)
  const [historial, setHistorial] = useState<Utilidad[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const toast = useToast()

  const cargarPropuesta = (p: string) => {
    api.utilidades.propuesta(p).then(setPropuesta)
  }
  const cargarHistorial = () => api.utilidades.historial().then(setHistorial)

  useEffect(() => {
    cargarPropuesta(periodo)
    cargarHistorial()
    api.socios.listar().then(setSocios)
  }, [])

  useEffect(() => { cargarPropuesta(periodo) }, [periodo])

  const nombreDe = (id: string) => socios.find((s) => s.id === id)?.nombre || '(socio eliminado)'
  const totalAportes = propuesta?.distribucion.reduce((s, d) => s + d.aportesBase, 0) || 0

  const liquidar = async () => {
    if (!propuesta) return
    if (!confirm(`¿Liquidar la utilidad de ${periodoLabel(periodo)} por ${fmt(propuesta.neta)}? Esta acción queda registrada en el historial.`)) return
    try {
      await api.utilidades.liquidar(periodo)
      cargarPropuesta(periodo); cargarHistorial()
      toast.show('Utilidad liquidada y distribuida.')
    } catch {
      toast.show('Este periodo ya fue liquidado.')
    }
  }

  return (
    <>
      <div className="topbar"><div><h1>Utilidades</h1><div className="date">Reparto proporcional a los aportes de cada socio</div></div></div>
      <div className="card">
        <h2>Calcular utilidad de un periodo</h2>
        <div className="form-grid" style={{ maxWidth: 260 }}>
          <div><label>Periodo</label><input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></div>
        </div>
        {propuesta && (
          <>
            <div className="stats-row">
              <Stat label="Intereses cobrados" value={fmt(propuesta.intereses)} />
              <Stat label="Gastos del periodo" value={fmt(propuesta.gastos)} kind="neg" />
              <Stat label="Utilidad neta" value={fmt(propuesta.neta)} kind="pos" />
            </div>
            <h3>Distribución propuesta</h3>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Socio</th><th className="num">Aportes (base)</th><th>% participación</th><th className="num">Utilidad asignada</th></tr></thead>
                <tbody>
                  {propuesta.distribucion.map((d) => (
                    <tr key={d.socioId}>
                      <td>{nombreDe(d.socioId)}</td>
                      <td className="num">{fmt(d.aportesBase)}</td>
                      <td>{totalAportes > 0 ? ((d.aportesBase / totalAportes) * 100).toFixed(1) : '0'}%</td>
                      <td className="num">{fmt(d.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {propuesta.yaLiquidado
              ? <div className="hint" style={{ marginTop: 10 }}>Este periodo ya fue liquidado.</div>
              : <div style={{ marginTop: 16 }}><button className="btn" onClick={liquidar}>Liquidar utilidad de este periodo</button></div>}
          </>
        )}
      </div>
      <div className="card">
        <h2>Historial de liquidaciones</h2>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Periodo</th><th className="num">Intereses</th><th className="num">Gastos</th><th className="num">Utilidad neta</th><th>Fecha liquidación</th></tr></thead>
            <tbody>
              {historial.length === 0 && <tr><td colSpan={5} className="empty">Sin liquidaciones aún.</td></tr>}
              {historial.map((u) => (
                <tr key={u.id}>
                  <td>{periodoLabel(u.periodo)}</td><td className="num">{fmt(u.totalIntereses)}</td>
                  <td className="num">{fmt(u.totalGastos)}</td><td className="num">{fmt(u.utilidadNeta)}</td><td>{u.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
