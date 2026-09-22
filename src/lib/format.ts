export function fmt(n: number | undefined | null): string {
  const v = Number(n) || 0
  const neg = v < -0.5
  const abs = Math.round(Math.abs(v))
  const s = '$' + abs.toLocaleString('es-CO')
  return neg ? `(${s})` : s
}

export function fmtPct(n: number | undefined | null): string {
  return (Number(n || 0) * 100).toFixed(2).replace(/\.00$/, '') + '%'
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

export function periodoLabel(p: string | undefined | null): string {
  if (!p) return '—'
  const [y, m] = p.split('-')
  return `${MESES[parseInt(m, 10) - 1]} ${y}`
}

export function periodoActual(): string {
  return new Date().toISOString().slice(0, 7)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
