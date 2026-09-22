const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export type Socio = { id: string; nombre: string; activo: boolean; fechaIngreso: string }
export type Aporte = { id: string; socioId: string; periodo: string; fecha: string; monto: number; nota: string }
export type Cuota = {
  numero: number; fechaProgramada: string; cuota: number; interes: number; capital: number
  saldo: number; pagado: boolean; fechaPago: string | null; montoPagado: number | null; esGracia: boolean
}
export type Prestamo = {
  id: string; socioId: string; monto: number; tasa: number; numCuotas: number
  fechaInicio: string; estado: string; cuotas: Cuota[]; nota: string
}
export type Gasto = { id: string; concepto: string; periodo: string; fecha: string; monto: number }
export type DistribucionItem = { socioId: string; aportesBase: number; monto: number }
export type Utilidad = {
  id: string; periodo: string; totalIntereses: number; totalGastos: number
  utilidadNeta: number; distribucion: DistribucionItem[]; fecha: string
}
export type ConfigGlobal = { id: string; tasaDefault: number; ultimaLiquidacion: string | null }
export type SocioSaldo = {
  socioId: string; nombre: string; activo: boolean; aportes: number
  prestamoPendiente: number; utilidadRecibida: number; saldoNeto: number
}
export type Resumen = {
  bancos: number; aportesTotales: number; prestamosPendientes: number
  utilidadSinLiquidar: number; interesesMesActual: number; saldosPorSocio: SocioSaldo[]
}
export type UtilidadPeriodo = {
  periodo: string; intereses: number; gastos: number; neta: number
  distribucion: DistribucionItem[]; yaLiquidado: boolean
}
export type ProyeccionMes = { periodo: string; interesesMes: number; utilidadMes: number; acumUtilidad: number; acumAportes: number }

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `Error ${res.status} en ${path}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // respuesta sin cuerpo JSON, se deja el mensaje genérico
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  socios: {
    listar: () => req<Socio[]>('/socios'),
    obtener: (id: string) => req<Socio>(`/socios/${id}`),
    crear: (data: Partial<Socio>) => req<Socio>('/socios', { method: 'POST', body: JSON.stringify(data) }),
    actualizar: (id: string, data: Partial<Socio>) => req<Socio>(`/socios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    eliminar: (id: string) => req<void>(`/socios/${id}`, { method: 'DELETE' }),
  },
  aportes: {
    listar: (socioId?: string) => req<Aporte[]>(`/aportes${socioId ? `?socioId=${socioId}` : ''}`),
    crear: (data: Partial<Aporte>) => req<Aporte>('/aportes', { method: 'POST', body: JSON.stringify(data) }),
    eliminar: (id: string) => req<void>(`/aportes/${id}`, { method: 'DELETE' }),
  },
  prestamos: {
    listar: (socioId?: string) => req<Prestamo[]>(`/prestamos${socioId ? `?socioId=${socioId}` : ''}`),
    obtener: (id: string) => req<Prestamo>(`/prestamos/${id}`),
    crear: (data: { socioId: string; monto: number; tasa: number; numCuotas: number; fechaInicio: string; aplicarGraciaDiciembre: boolean }) =>
      req<Prestamo>('/prestamos', { method: 'POST', body: JSON.stringify(data) }),
    generarTabla: (id: string, data: { tasa: number; numCuotas: number; fechaInicio: string; aplicarGraciaDiciembre: boolean }) =>
      req<Prestamo>(`/prestamos/${id}/generar-tabla`, { method: 'POST', body: JSON.stringify(data) }),
    eliminarTabla: (id: string) => req<Prestamo>(`/prestamos/${id}/tabla`, { method: 'DELETE' }),
    pagarCuota: (id: string, numero: number, data: { fechaPago: string; montoPagado: number }) =>
      req<Prestamo>(`/prestamos/${id}/cuotas/${numero}/pagar`, { method: 'POST', body: JSON.stringify(data) }),
    eliminar: (id: string) => req<void>(`/prestamos/${id}`, { method: 'DELETE' }),
  },
  gastos: {
    listar: () => req<Gasto[]>('/gastos'),
    crear: (data: Partial<Gasto>) => req<Gasto>('/gastos', { method: 'POST', body: JSON.stringify(data) }),
    eliminar: (id: string) => req<void>(`/gastos/${id}`, { method: 'DELETE' }),
  },
  utilidades: {
    propuesta: (periodo: string) => req<UtilidadPeriodo>(`/utilidades/propuesta?periodo=${periodo}`),
    historial: () => req<Utilidad[]>('/utilidades'),
    liquidar: (periodo: string) => req<Utilidad>('/utilidades/liquidar', { method: 'POST', body: JSON.stringify({ periodo }) }),
  },
  proyeccion: {
    obtener: (meses: number, aporteExtra: number) => req<ProyeccionMes[]>(`/proyeccion?meses=${meses}&aporteExtra=${aporteExtra}`),
  },
  config: {
    obtener: () => req<ConfigGlobal>('/config'),
    actualizar: (tasaDefault: number) => req<ConfigGlobal>('/config', { method: 'PUT', body: JSON.stringify({ tasaDefault }) }),
  },
  resumen: {
    obtener: () => req<Resumen>('/resumen'),
  },
}
