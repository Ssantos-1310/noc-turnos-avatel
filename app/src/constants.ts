// ── Festivos Madrid 2026 ──────────────────────────────────────────────────────
export const FEST_2026 = [
  '2026-01-01', // Año Nuevo
  '2026-01-06', // Reyes
  '2026-04-02', // Jueves Santo (C. Madrid)
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-02', // Fiesta de la Comunidad de Madrid
  '2026-05-15', // San Isidro (Madrid capital)
  '2026-08-15', // Asunción
  '2026-10-12', // Fiesta Nacional
  '2026-11-01', // Todos los Santos
  '2026-11-09', // Virgen de la Almudena
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
]

// ── Operadores (nombres completos en orden de cuadrante) ─────────────────────
export const EMPS = [
  'Hector Jose Lamus Moreno',
  'Hector Verdu Relaño',
  'Francisco Castaño Montouto',
  'Mario Saavedra Mateo',
  'Ruben Culebras Blanco',
  'Manuel Saelices Escolar',
  'Marianela Beatriz Vasquez Guardia',
  'Pedro Pablo Ayuso Muñoz',
  'Juan Carlos Farfan Mallaupoma',
  'Leandro Yorlan Roman Jaimes',
  'Sergio Vara',
  'Zhou Hongxuan',
  'Valentina Vargas Moreno',
  'Sergio Luque Lavado',
  'Carlos Alberto Hilleshein',
  'Manuel Loro Sanchez de Pablo',
  'Jose Luis Carrillo Sierra',
]

/** Nombre completo → nombre corto (clave en BD y cuadrante) */
export const EMP_SHORT: Record<string, string> = {
  'Hector Jose Lamus Moreno': 'Hector Lamus',
  'Hector Verdu Relaño': 'Hector Verdu',
  'Francisco Castaño Montouto': 'Francisco Castaño',
  'Mario Saavedra Mateo': 'Mario Saavedra',
  'Ruben Culebras Blanco': 'Ruben Culebras',
  'Manuel Saelices Escolar': 'Manuel Saelices',
  'Marianela Beatriz Vasquez Guardia': 'Marianela Beatriz',
  'Pedro Pablo Ayuso Muñoz': 'Pedro Ayuso',
  'Juan Carlos Farfan Mallaupoma': 'Juan Carlos',
  'Leandro Yorlan Roman Jaimes': 'Leandro Yorlan',
  'Sergio Vara': 'Sergio Vara',
  'Zhou Hongxuan': 'Zhou Hongxuan',
  'Valentina Vargas Moreno': 'Valentina Vargas',
  'Sergio Luque Lavado': 'Sergio Luque',
  'Carlos Alberto Hilleshein': 'Carlos Alberto',
  'Manuel Loro Sanchez de Pablo': 'Manuel Loro',
  'Jose Luis Carrillo Sierra': 'Jose Luis Carrillo',
}

// ── Calendario ────────────────────────────────────────────────────────────────

/** Días por mes (2026 no es bisiesto) */
export const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const MONTHS_KEY = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export const MONTHS_LABEL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DAY_NAMES = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// ── Turnos ────────────────────────────────────────────────────────────────────

export const SHIFT_LABELS: Record<string, string> = {
  M: 'Mañana',
  T: 'Tarde',
  N: 'Noche',
  V: 'Vacaciones',
  B: 'Baja',
  D: 'Horas extras',
  O: 'Oficina',
  P: 'Asuntos propios',
}

/** Cobertura mínima semana laboral */
export const MIN_WEEKDAY = { M: 4, T: 4, N: 2 }

/** Cobertura mínima fin de semana */
export const MIN_WEEKEND = { M: 2, T: 2, N: 2 }

// ── Contrato anual 2026 ───────────────────────────────────────────────────────
export const HMAX = 1624   // horas pactadas
export const JMAX = 203    // jornadas
export const VMAX = 23     // días de vacaciones

// ── Guardia N2 ───────────────────────────────────────────────────────────────
export const GUARDIA_N2_IMPORTE = 150
export const GUARDIA_N2_FESTIVO_IMPORTE = 75

// ── Helpers de fecha ─────────────────────────────────────────────────────────

export function isFest(monthIdx: number, day: number): boolean {
  const d = `2026-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return FEST_2026.includes(d)
}

export function isWeekend(monthIdx: number, day: number): boolean {
  const dow = new Date(2026, monthIdx, day).getDay()
  return dow === 0 || dow === 6
}

/** Último día del mes como string YYYY-MM-DD (evita el bug de -31 en Abril etc.) */
export function monthEndDate(monthIdx: number): string {
  return `2026-${String(monthIdx + 1).padStart(2, '0')}-${String(MD[monthIdx]).padStart(2, '0')}`
}
