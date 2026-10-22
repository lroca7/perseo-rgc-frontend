import { useEffect, useState } from 'react'
import {
  api,
  type CapacidadPrestamoItem,
  type FondoProyeccion,
} from '../api/client'
import { fmt, periodoLabel } from '../lib/format'
import { Stat, Pill } from '../components/Shared'

/** Motivo por el que un socio no alcanza en su mes de turno. */
function motivo(i: CapacidadPrestamoItem): { texto: string; kind: 'pos' | 'neg' | 'warn' } {
  if (!i.alcanzaFondo) return { texto: 'No alcanza', kind: 'neg' }
  if (i.mesesExtra === 0) {
    return i.prestamoParcial
      ? { texto: `Parcial: ${fmt(i.montoOtorgado)}`, kind: 'warn' }
      : { texto: 'En su turno', kind: 'pos' }
  }
  if (i.brechaEnTurno > 0) {
    return { texto: `Espera ${i.mesesExtra} m · le faltaba ${fmt(i.brechaEnTurno)}`, kind: 'warn' }
  }
  return { texto: `Espera ${i.mesesExtra} m · turno anterior bloqueado`, kind: 'warn' }
}

export default function CapacidadPrestamos() {
  const [items, setItems] = useState<CapacidadPrestamoItem[]>([])
  const [fondo, setFondo] = useState<FondoProyeccion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.capacidadPrestamos.listar(), api.capacidadPrestamos.fondo()])
      .then(([i, f]) => { setItems(i); setFondo(f) })
      .finally(() => setLoading(false))
  }, [])

  const totalCupo = items.reduce((s, i) => s + i.disponible, 0)
  const totalOtorgado = items.reduce((s, i) => s + i.montoOtorgado, 0)
  const seOtorgan = items.filter(i => i.alcanzaFondo).length
  const enSuTurno = items.filter(i => i.alcanzaFondo && i.mesesExtra === 0).length
  const parciales = items.filter(i => i.prestamoParcial).length
  const ancla = items[0]?.anclaPeriodo ?? fondo?.anclaPeriodo ?? ''
  const proxima = fondo?.proximaLiquidacion ?? null
  const ultima = fondo?.meses?.length ? fondo.meses[fondo.meses.length - 1] : null
  const ultimo = items.filter(i => i.mesAlcance).sort((a, b) => (a.mesAlcance! < b.mesAlcance! ? 1 : -1))[0]

  if (loading) return <div className="empty">Cargando capacidad de préstamos…</div>

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Caja del fondo — capacidad de préstamo</h1>
          <div className="date">
            Qué puede prestar el fondo según su caja, mes a mes. Cada socio puede pedir hasta
            <strong> 2 × sus aportes </strong> proyectados a su mes de turno (diciembre no cuenta), menos el saldo
            de su préstamo anterior. La utilidad se reparte en junio y diciembre, y <strong>solo si hay caja</strong>
            para pagarla. Base: aportes acumulados a {periodoLabel(ancla)}.
          </div>
        </div>
        <div className="row-actions">
          <Stat label="Socios con turno" value={String(items.length)} />
          <Stat label="Alcanzan en su turno" value={`${enSuTurno} / ${items.length}`} kind={enSuTurno === items.length ? 'pos' : 'neg'} />
          <Stat label="Se otorgan (con espera)" value={`${seOtorgan} / ${items.length}`} />
          <Stat label="Cupo total (2× aportes)" value={fmt(totalCupo)} />
          <Stat label="Prestado en la simulación" value={fmt(totalOtorgado)} />
        </div>
      </div>

      {parciales > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--gold)' }}>
          <div className="section-desc" style={{ margin: 0 }}>
            <strong>Modo préstamos parciales activo.</strong> El fondo otorga en el mes de turno
            <strong> lo que puede</strong> (el menor entre el cupo del socio y la caja disponible),
            no el cupo completo. Por eso {parciales} de {items.length} turnos se otorgan por menos de
            lo que le correspondía. Se cambia en <strong>Configuración → Simulación de capacidad de préstamos</strong>.
          </div>
        </div>
      )}

      {proxima && (
        <div className="card" style={{ borderLeft: '3px solid var(--gold)' }}>
          <h2>
            Próxima liquidación de utilidad — {periodoLabel(proxima.periodo)}
            {!proxima.cubierta && <span style={{ marginLeft: 10 }}><Pill kind="neg">Sin caja: se pospone</Pill></span>}
          </h2>
          <div className="section-desc">
            La utilidad acumulada se reparte a los socios. Sale de la caja, así que hay que
            descontarla para saber cuánto queda realmente para prestar.
          </div>
          <div className="form-grid" style={{ maxWidth: 900 }}>
            <div><div className="hint">Utilidad a pagar a los socios</div><div className="strong">{fmt(proxima.utilidad)}</div></div>
            <div><div className="hint">Caja antes de pagar</div><div>{fmt(proxima.cajaAntes)}</div></div>
            <div><div className="hint">Caja después de pagar</div><div className={proxima.cajaDespues >= 0 ? 'pos' : 'neg'}><strong>{fmt(proxima.cajaDespues)}</strong></div></div>
            <div><div className="hint">Disponible para prestar</div><div className="gold"><strong>{fmt(proxima.cajaDespues)}</strong></div></div>
          </div>
          <div className="hint" style={{ marginTop: 8 }}>
            {fmt(proxima.cajaAntes)} − {fmt(proxima.utilidad)} = <strong>{fmt(proxima.cajaDespues)}</strong>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Proyección mes a mes de la caja del fondo</h2>
        <div className="section-desc">
          Cada mes entran los <strong>aportes</strong> y los <strong>cobros de cuotas</strong> (capital + interés);
          salen los <strong>préstamos otorgados</strong> y, en junio y diciembre, la <strong>utilidad</strong> acumulada.
          La <em>caja disponible</em> es lo que queda después de reservar la utilidad que todavía no se ha
          repartido: es el máximo que el fondo puede prestar sin deberle a sus socios.
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Mes</th><th className="num">Fondo al inicio</th><th className="num">+ Aportes</th>
                <th className="num">+ Cobros de cuotas</th><th className="num">− Utilidad a pagar</th>
                <th className="num">− Préstamos</th><th className="num">Fondo al final</th>
                <th className="num">Utilidad sin repartir</th><th className="num">Caja disponible</th>
              </tr>
            </thead>
            <tbody>
              {(fondo?.meses ?? []).map((m) => (
                <tr key={m.periodo} style={m.esLiquidacion ? { background: 'var(--gold-soft)' } : undefined}>
                  <td>
                    {periodoLabel(m.periodo)}
                    {m.esLiquidacion && <span style={{ marginLeft: 8 }}><Pill kind="warn">Liquidación</Pill></span>}
                  </td>
                  <td className="num">{fmt(m.fondoInicial)}</td>
                  <td className="num">{m.aportes > 0 ? fmt(m.aportes) : '—'}</td>
                  <td className="num">{m.cobros > 0 ? fmt(m.cobros) : '—'}</td>
                  <td className="num">{m.utilidadAPagar > 0 ? <span className="neg">−{fmt(m.utilidadAPagar)}</span> : '—'}</td>
                  <td className="num">{m.desembolsos > 0 ? <span className="neg">−{fmt(m.desembolsos)}</span> : '—'}</td>
                  <td className="num">{fmt(m.fondoFinal)}</td>
                  <td className="num">{m.utilidadSinRepartir > 0 ? <span className="gold">{fmt(m.utilidadSinRepartir)}</span> : '—'}</td>
                  <td className="num"><strong>{fmt(m.cajaDisponible)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul style={{ marginTop: 10, lineHeight: '1.8' }} className="hint">
          <li><strong>Diciembre</strong> (filas sin aportes ni cobros): es mes de gracia, no se cobra nada.</li>
          <li>Las filas <Pill kind="warn">Liquidación</Pill> muestran cuánto sale del fondo para pagar la utilidad a los socios.</li>
          <li>Si en algún cierre <strong>no hubiera caja suficiente</strong>, la liquidación se pospone y la utilidad sigue acumulada.</li>
          {ultima && <li>La proyección llega hasta <strong>{periodoLabel(ultima.periodo)}</strong>.</li>}
        </ul>
      </div>

      <div className="card">
        <h2>Cuánto puede prestar el fondo a cada socio</h2>
        <div className="section-desc">
          Lo que le corresponde a cada uno por sus aportes (en su mes de turno) contra lo que el fondo tenía
          en caja ese día. El <strong>préstamo ideal</strong> es el menor de los dos.
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Socio</th><th className="num">Su turno</th>
                <th className="num">Aportes hoy</th><th className="num">Aportes proyectados</th>
                <th className="num">Capacidad 2×</th><th className="num">Saldo al turno</th>
                <th className="num">Le corresponde</th><th className="num">Caja del fondo ese mes</th>
                <th className="num">Préstamo ideal</th><th className="num">Le faltó</th>
                <th>Motivo de la espera</th><th className="num">Lo recibe en</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const m = motivo(i)
                return (
                  <tr key={i.socioId}>
                    <td>{i.turno}</td>
                    <td>{i.nombre}</td>
                    <td className="num">{periodoLabel(i.mesTurno)}</td>
                    <td className="num">{fmt(i.aportes)}</td>
                    <td className="num">{fmt(i.aportesProyectadosEnTurno)}</td>
                    <td className="num">{fmt(i.capacidadMaxEnTurno)}</td>
                    <td className="num">{fmt(i.prestamoActivoSaldoProyectadoEnTurno)}</td>
                    <td className="num"><strong>{fmt(i.disponibleEnTurno)}</strong></td>
                    <td className="num">{fmt(i.cajaDisponibleEnTurno)}</td>
                    <td className="num"><strong>{fmt(i.prestamoIdealEnTurno)}</strong></td>
                    <td className="num">{i.brechaEnTurno > 0 ? <span className="neg">{fmt(i.brechaEnTurno)}</span> : '—'}</td>
                    <td><Pill kind={m.kind}>{m.texto}</Pill></td>
                    <td className="num">{i.mesAlcance ? periodoLabel(i.mesAlcance) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ul style={{ marginTop: 10, lineHeight: '1.8' }} className="hint">
          <li><strong>Le corresponde</strong> = 2 × aportes proyectados − saldo de su préstamo viejo, en su mes de turno.</li>
          <li><strong>Le faltó &gt; $0</strong> = el fondo no tenía para su cupo completo en su mes de turno.</li>
          <li><strong>Le faltó = $0</strong> = el fondo sí podía, pero el turno anterior lo frenó.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Supuestos de la simulación</h2>
        <ul style={{ marginTop: 8, lineHeight: '1.8' }}>
          <li>Se asume que <strong>todos los socios activos siguen pagando</strong> el aporte mensual durante todo el horizonte.</li>
          <li>Los <strong>gastos futuros se asumen en $0</strong> (no hay datos), así que el fondo real quedará más apretado que esta proyección.</li>
          <li>La utilidad se reparte <strong>en efectivo</strong> en junio y diciembre, y solo si hay caja para pagarla.</li>
          <li>Cuando un socio refinance, su préstamo viejo <strong>se recoge</strong>: deja de generar cobros y el saldo se descuenta del cupo nuevo.</li>
          <li>El préstamo nuevo simulado se repaga en el número de cuotas configurado (18 por defecto), saltando diciembre, y esa plata vuelve al fondo.</li>
          <li>El patrimonio del fondo (caja + cartera de préstamos por cobrar) <strong>nunca queda negativo</strong>: el fondo no se rompe, queda ilíquido.{' '}
            {ultimo && <> El último préstamo del plan se otorgaría en <strong>{periodoLabel(ultimo.mesAlcance!)}</strong>.</>}
          </li>
        </ul>
      </div>
    </>
  )
}
