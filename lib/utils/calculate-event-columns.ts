/**
 * Utilidad para calcular columnas de eventos superpuestos en el calendario
 *
 * Este algoritmo distribuye eventos que ocurren al mismo tiempo en columnas
 * separadas para evitar que se apilen visualmente uno encima del otro.
 *
 * Usa un algoritmo de 2 pasadas:
 * 1. Primera pasada: asigna columnas a medida que procesa eventos
 * 2. Segunda pasada: agrupa eventos superpuestos y normaliza totalColumns
 */

// Interface base para eventos - solo requiere los campos necesarios para el calculo
export interface BaseEvent {
  _id: string
  startTime: string
  endTime?: string
}

// Interface para eventos con columna calculada
export interface EventWithColumn<T extends BaseEvent = BaseEvent> extends BaseEvent {
  column: number
  totalColumns: number
  // Preservar todas las propiedades originales del evento
  [key: string]: unknown
}

/**
 * Calcula la posicion de columna para eventos superpuestos
 *
 * @param events - Array de eventos a procesar
 * @param defaultDurationMs - Duracion por defecto en ms para eventos sin endTime (default: 30 min)
 * @returns Array de eventos con column y totalColumns calculados
 *
 * @example
 * const events = [
 *   { _id: '1', startTime: '2024-01-01T10:00:00', endTime: '2024-01-01T10:30:00' },
 *   { _id: '2', startTime: '2024-01-01T10:15:00', endTime: '2024-01-01T10:45:00' },
 * ]
 * const result = calculateEventColumns(events)
 * // Resultado: eventos con column=0 y column=1, totalColumns=2
 */
export function calculateEventColumns<T extends BaseEvent>(
  events: T[],
  defaultDurationMs: number = 30 * 60 * 1000
): (T & { column: number; totalColumns: number })[] {
  if (events.length === 0) return []

  // Ordenar por hora de inicio
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  type EventWithCol = T & { column: number; totalColumns: number }
  const eventsWithColumns: EventWithCol[] = []
  const activeColumns: { endTime: number; column: number }[] = []

  // Primera pasada: asignar columnas
  sortedEvents.forEach(event => {
    const startTime = new Date(event.startTime).getTime()
    const endTime = event.endTime
      ? new Date(event.endTime).getTime()
      : startTime + defaultDurationMs

    // Limpiar columnas que ya terminaron
    const finishedColumns = activeColumns.filter(col => col.endTime <= startTime)
    finishedColumns.forEach(col => {
      const idx = activeColumns.indexOf(col)
      if (idx > -1) activeColumns.splice(idx, 1)
    })

    // Encontrar la primera columna disponible
    let column = 0
    const usedColumns = activeColumns.map(c => c.column).sort((a, b) => a - b)
    for (let i = 0; i <= usedColumns.length; i++) {
      if (!usedColumns.includes(i)) {
        column = i
        break
      }
    }

    // Agregar a columnas activas
    activeColumns.push({ endTime, column })

    // Guardar evento con su columna (preservando todas las propiedades originales)
    eventsWithColumns.push({
      ...event,
      column,
      totalColumns: Math.max(...activeColumns.map(c => c.column)) + 1,
    })
  })

  // Segunda pasada: agrupar eventos superpuestos y normalizar totalColumns
  const groups: EventWithCol[][] = []
  let currentGroup: EventWithCol[] = []
  let groupEndTime = 0

  eventsWithColumns.forEach(event => {
    const startTime = new Date(event.startTime).getTime()

    // Si este evento empieza despues de que terminaron todos los del grupo actual,
    // cerrar el grupo y empezar uno nuevo
    if (startTime >= groupEndTime && currentGroup.length > 0) {
      groups.push(currentGroup)
      currentGroup = []
    }

    currentGroup.push(event)

    const endTime = event.endTime
      ? new Date(event.endTime).getTime()
      : startTime + defaultDurationMs
    groupEndTime = Math.max(groupEndTime, endTime)
  })

  // Agregar el ultimo grupo si tiene eventos
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  // Actualizar totalColumns para cada grupo
  const result: EventWithCol[] = []
  groups.forEach(group => {
    const maxColumn = Math.max(...group.map(e => e.column)) + 1
    group.forEach(event => {
      result.push({ ...event, totalColumns: maxColumn })
    })
  })

  return result
}

/**
 * Filtra eventos visibles cuando hay demasiadas columnas
 * Retorna los eventos que deben mostrarse y cuantos estan ocultos
 *
 * @param eventsWithColumns - Eventos ya procesados con columnas
 * @param maxVisibleColumns - Maximo de columnas a mostrar (default: 3)
 * @returns Objeto con eventos visibles, ocultos y conteo
 */
export function filterVisibleEvents<T extends BaseEvent>(
  eventsWithColumns: (T & { column: number; totalColumns: number })[],
  maxVisibleColumns: number = 3
): {
  visible: (T & { column: number; totalColumns: number })[]
  hidden: (T & { column: number; totalColumns: number })[]
  hiddenCount: number
} {
  const visible = eventsWithColumns.filter(e => e.column < maxVisibleColumns)
  const hidden = eventsWithColumns.filter(e => e.column >= maxVisibleColumns)

  return {
    visible,
    hidden,
    hiddenCount: hidden.length
  }
}
