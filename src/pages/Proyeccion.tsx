import { Fragment, useEffect, useState } from 'react'
import { api, type ProyeccionMes, type Resumen } from '../api/client'
import { fmt, periodoLabel } from '../lib/format'
import { Stat } from '../components/Shared'

type TargetType = 'dic' | 'jun' | 'otro'

/** Próxima ocurrencia futura de un mes dado (ej. 12 = diciembre). */
function proximaOcurrencia(targetMonth: number): { year: number; month: number } {
  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1
  const year = targetMonth > curM ? curY : curY + 1
  return { year, month: targetMonth }
}

function mesesHasta(year: number, month: number): number {
  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1
  return Math.max(1, (year - curY) * 12 + (month - curM))
}

function siguienteMesISO(): string {
  const now = new Date()
  now.setMonth(now.getMonth() + 1)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Proyeccion() {
  const [targetType, setTargetType] = useState<TargetType>('dic')
  const [customMonth, setCustomMonth] = useState(siguienteMesISO())
  const [aporteExtra, setAporteExtra] = useState(0)
  const [datos, setDatos] = useState<ProyeccionMes[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  useEffect(() => {
    api.resumen.obtener().then(setResumen)
  }, [])

  const target = targetType === 'dic'
    ? proximaOcurrencia(12)
    : targetType === 'jun'
      ? proximaOcurrencia(6)
      : { year: Number(customMonth.split('-')[0]), month: Number(customMonth.split('-')[1]) }
  const mesesAhead = mesesHasta(target.year, target.month)
  const esDiciembre = target.month === 12

  useEffect(() => {
    api.proyeccion.obtener(mesesAhead, aporteExtra).then(setDatos)
  }, [mesesAhead, aporteExtra])

  const objetivo = datos.length ? datos[datos.length - 1] : null
  const utilidadTotalLiquidada = resumen ? resumen.saldosPorSocio.reduce((s, x) => s + x.utilidadRecibida, 0) : 0
  const totalAportesHoy = resumen ? resumen.aportesTotales : 0
  const utilidadProyTotal = objetivo ? objetivo.acumUtilidad - utilidadTotalLiquidada : 0
  const maxUtil = Math.max(1, ...datos.map((d) => d.acumUtilidad))

  return (
    <>
      <div className="topbar"><div><h1>Proyección de utilidades</h1><div className="date">Con base en las cuotas de préstamos activos ya programadas</div></div></div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className={targetType === 'dic' ? 'btn small' : 'btn secondary small'} onClick={() => setTargetType('dic')}>Diciembre</button>
          <button className={targetType === 'jun' ? 'btn small' : 'btn secondary small'} onClick={() => setTargetType('jun')}>Junio</button>
          <button className={targetType === 'otro' ? 'btn small' : 'btn secondary small'} onClick={() => setTargetType('otro')}>Otro mes…</button>
          {targetType === 'otro' && (
            <input type="month" value={customMonth} min={siguienteMesISO()} onChange={(e) => setCustomMonth(e.target.value)} style={{ width: 160 }} />
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Aporte mensual adicional supuesto (por socio activo)</label>
            <input type="number" value={aporteExtra} onChange={(e) => setAporteExtra(Number(e.target.value) || 0)} style={{ width: 120 }} />
          </div>
        </div>

        <div style={{ background: 'var(--green-soft)', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
          <div className="hint" style={{ marginBottom: 2 }}>Proyección a</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{periodoLabel(`${target.year}-${String(target.month).padStart(2, '0')}`)}</div>
        </div>

        <div className="stats-row">
          <Stat label="Utilidad acumulada proyectada" value={fmt(objetivo?.acumUtilidad)} />
          <Stat label="Aportes acumulados proyectados" value={fmt(objetivo?.acumAportes)} />
        </div>

        {esDiciembre && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--gold-soft)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            <span style={{ color: 'var(--gold)' }}>ℹ</span>
            <span className="hint" style={{ margin: 0, color: 'var(--gold)' }}>
              Diciembre es mes de gracia: no se cobra interés ese mes, por eso la utilidad acumulada no sube respecto a noviembre.
            </span>
          </div>
        )}

        <div className="section-desc">La proyección solo incluye intereses de cuotas ya generadas con fecha futura. Si creas nuevos préstamos, actualízala.</div>

        <h3>Reparto proyectado por socio</h3>
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

        <button className="btn secondary" style={{ width: '100%', justifyContent: 'space-between', display: 'flex', marginTop: 16 }} onClick={() => setDetalleAbierto(!detalleAbierto)}>
          Ver detalle mes a mes
          <span style={{ transform: detalleAbierto ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
        </button>
        {detalleAbierto && (
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
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
        )}
      </div>
    </>
  )
}
