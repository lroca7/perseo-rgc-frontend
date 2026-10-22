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
export type ConfigGlobal = {
  id: string
  tasaDefault: number
  ultimaLiquidacion: string | null
  ajusteInteresesHistoricos: number
  aporteMensualSocio: number
  usarUltimoAporteReal: boolean
  numCuotasSimulacion: number
  prestamosParciales: boolean
}
/** Un mes de la proyección de la caja del fondo. */
export type FondoMesItem = {
  periodo: string
  fondoInicial: number
  aportes: number            // 0 en diciembre
  cobros: number             // cuotas cobradas (capital + interés)
  utilidadDevengada: number  // interés acumulado en el mes
  utilidadAPagar: number     // utilidad que sale del fondo (0 si no es mes de cierre)
  utilidadSinRepartir: number
  desembolsos: number
  fondoFinal: number
  cajaDisponible: number
  esLiquidacion: boolean
  esGracia: boolean
}

/** Una liquidación de utilidad proyectada (junio y diciembre). */
export type LiquidacionItem = {
  periodo: string
  utilidad: number
  cajaAntes: number
  cajaDespues: number
  cubierta: boolean          // false = no había caja, se pospone
}

export type FondoProyeccion = {
  anclaPeriodo: string
  meses: FondoMesItem[]
  liquidaciones: LiquidacionItem[]
  proximaLiquidacion: LiquidacionItem | null
}

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
export type CapacidadPrestamoItem = {
  socioId: string; nombre: string; turno: number
  mesTurno: string            // mes calendario del turno (un socio por mes)
  anclaPeriodo: string        // período base de la proyección (último con aportes)
  mesesProyectados: number    // nº de meses con aporte (sin diciembre) desde el ancla
  aportes: number             // aportes acumulados hoy
  aportesProyectados: number  // aportes acumulados en el mes de otorgamiento
  capacidadMax: number        // 2 x aportesProyectados
  prestamoActivoSaldo: number              // saldo del préstamo viejo hoy
  prestamoActivoSaldoProyectado: number    // saldo del préstamo viejo en el mes de otorgamiento
  disponible: number                        // cupo completo en el mes de otorgamiento
  fondoProyectadoTurno: number   // caja del fondo en el mes calendario del turno
  cajaDisponible: number         // caja menos utilidad acumulada sin repartir
  // --- panorama en el mes calendario del turno ---
  disponibleEnTurno: number      // lo que le correspondía al socio ese mes
  cajaDisponibleEnTurno: number  // caja que el fondo tenía ese mes
  prestamoIdealEnTurno: number   // el menor de los dos: lo que el fondo podía prestarle
  brechaEnTurno: number          // lo que le faltó para el cupo completo
  aportesProyectadosEnTurno: number
  capacidadMaxEnTurno: number
  prestamoActivoSaldoProyectadoEnTurno: number
  // --- resultado ---
  montoOtorgado: number          // monto final del préstamo otorgado
  prestamoParcial: boolean       // se otorgó menos que su cupo completo
  alcanzaFondo: boolean
  mesesExtra: number
  mesAlcance: string | null       // mes real en que se otorga el préstamo
}

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
  capacidadPrestamos: {
    listar: () => req<CapacidadPrestamoItem[]>('/capacidad-prestamos'),
    fondo: () => req<FondoProyeccion>('/capacidad-prestamos/fondo'),
  },
  config: {
    obtener: () => req<ConfigGlobal>('/config'),
    actualizar: (data: {
      tasaDefault: number
      ajusteInteresesHistoricos: number
      aporteMensualSocio: number
      usarUltimoAporteReal: boolean
      numCuotasSimulacion: number
      prestamosParciales: boolean
    }) => req<ConfigGlobal>('/config', { method: 'PUT', body: JSON.stringify(data) }),
  },
  resumen: {
    obtener: () => req<Resumen>('/resumen'),
  },
}