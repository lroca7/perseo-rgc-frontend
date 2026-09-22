import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Resumen as ResumenType } from '../api/client'
import { fmt } from '../lib/format'
import { Stat } from '../components/Shared'

export default function Resumen() {
  const [data, setData] = useState<ResumenType | null>(null)

  useEffect(() => {
    api.resumen.obtener().then(setData).catch(console.error)
  }, [])

  if (!data) return <div className="empty">Cargando…</div>

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Resumen general</h1>
          <div className="date">Actualizado {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      <div className="stats-row">
        <Stat label="Bancos" value={fmt(data.bancos)} />
        <Stat label="Aportes acumulados" value={fmt(data.aportesTotales)} />
        <Stat label="Préstamos por cobrar" value={fmt(data.prestamosPendientes)} />
        <Stat label="Utilidad sin liquidar" value={fmt(data.utilidadSinLiquidar)} kind={data.utilidadSinLiquidar >= 0 ? 'pos' : 'neg'} />
      </div>
      <div className="card">
        <h2>Saldo por socio</h2>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Socio</th><th className="num">Aportes</th><th className="num">Préstamo pendiente</th>
                <th className="num">Utilidad recibida</th><th className="num">Saldo neto</th>
              </tr>
            </thead>
            <tbody>
              {data.saldosPorSocio.map((s) => (
                <tr key={s.socioId}>
                  <td><Link className="socio-link" to={`/socios/${s.socioId}`}>{s.nombre}</Link></td>
                  <td className="num">{fmt(s.aportes)}</td>
                  <td className="num">{fmt(s.prestamoPendiente)}</td>
                  <td className="num">{fmt(s.utilidadRecibida)}</td>
                  <td className="num" style={{ fontWeight: 600, color: s.saldoNeto >= 0 ? 'var(--green)' : 'var(--brick)' }}>{fmt(s.saldoNeto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>Intereses cobrados este mes</h2>
        <div className="serif" style={{ fontSize: 26, fontWeight: 600 }}>{fmt(data.interesesMesActual)}</div>
      </div>
    </>
  )
}
