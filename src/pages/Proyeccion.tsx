import { Fragment, useEffect, useState } from 'react'
import { api, type ProyeccionMes, type Resumen, type Socio } from '../api/client'
import { fmt, periodoLabel } from '../lib/format'

export default function Proyeccion() {
  const [meses, setMeses] = useState(6)
  const [aporteExtra, setAporteExtra] = useState(0)
  const [datos, setDatos] = useState<ProyeccionMes[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [socios, setSocios] = useState<Socio[]>([])

  useEffect(() => {
    api.resumen.obtener().then(setResumen)
    api.socios.listar().then(setSocios)
  }, [])

  useEffect(() => {
    api.proyeccion.obtener(meses, aporteExtra).then(setDatos)
  }, [meses, aporteExtra])

  const maxUtil = Math.max(1, ...datos.map((d) => d.acumUtilidad))
  const utilidadTotalLiquidada = resumen ? resumen.saldosPorSocio.reduce((s, x) => s + x.utilidadRecibida, 0) : 0
  const totalAportesHoy = resumen ? resumen.aportesTotales : 0
  const utilidadProyTotal = datos.length ? datos[datos.length - 1].acumUtilidad - utilidadTotalLiquidada : 0

  return (
    <>
      <div className="topbar"><div><h1>Proyección de utilidades</h1><div className="date">Con base en las cuotas de préstamos activos ya programadas</div></div></div>
      <div className="card">
        <div className="form-grid" style={{ maxWidth: 420 }}>
          <div><label>Meses a proyectar</label><input type="number" min={1} max={24} value={meses} onChange={(e) => setMeses(Number(e.target.value) || 6)} /></div>
          <div><label>Aporte mensual adicional supuesto (por socio activo)</label><input type="number" value={aporteExtra} onChange={(e) => setAporteExtra(Number(e.target.value) || 0)} /></div>
        </div>
        <div className="section-desc">La proyección solo incluye intereses de cuotas ya generadas con fecha futura. Si creas nuevos préstamos, actualízala.</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Periodo</th><th className="num">Intereses proyectados</th><th className="num">Utilidad del mes</th><th className="num">Utilidad acumulada</th><th className="num">Aportes acumulados</th></tr></thead>
            <tbody>
              {datos.length === 0 && <tr><td colSpan={5} className="empty">Sin datos suficientes para proyectar.</td></tr>}
              {datos.map((d) => (
                <Fragment key={d.periodo}>
                  <tr>
                    <td>{periodoLabel(d.periodo)}</td><td className="num">{fmt(d.interesesMes)}</td><td className="num">{fmt(d.utilidadMes)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(d.acumUtilidad)}</td><td className="num">{fmt(d.acumAportes)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ padding: '0 10px 10px 10px', borderBottom: '1px solid var(--line)' }}>
                      <div className="progress-bar"><div className="fill" style={{ width: `${Math.max(2, (d.acumUtilidad / maxUtil) * 100)}%` }} /></div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>Proyección de saldo neto por socio (al final del periodo)</h2>
        <div className="section-desc">Supone reparto proporcional a aportes, igual que la utilidad liquidada históricamente.</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Socio</th><th className="num">Aportes hoy</th><th className="num">Préstamo pendiente hoy</th><th className="num">Utilidad proyectada (parte)</th><th className="num">Saldo neto proyectado</th></tr></thead>
            <tbody>
              {resumen?.saldosPorSocio.map((s) => {
                const parte = totalAportesHoy > 0 ? (s.aportes / totalAportesHoy) * utilidadProyTotal : 0
                const neto = s.aportes - s.prestamoPendiente + s.utilidadRecibida + parte
                return (
                  <tr key={s.socioId}>
                    <td>{s.nombre}</td><td className="num">{fmt(s.aportes)}</td><td className="num">{fmt(s.prestamoPendiente)}</td>
                    <td className="num">{fmt(parte)}</td><td className="num" style={{ fontWeight: 600 }}>{fmt(neto)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
