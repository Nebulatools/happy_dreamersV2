// 🖱️ Utilidad para manejar clicks en el calendario
"use client"

export interface ClickTimeResult {
  hour: number;
  minute: number;
  date: Date;
}

/**
 * Maneja el click en el calendario para crear eventos
 * @param clickEvent - Evento de click del mouse
 * @param dayDate - Fecha del día clickeado
 * @param hourHeight - Altura en pixels por hora (ej: 30)
 * @returns Objeto con hora, minuto y fecha, o null si click inválido
 */
export function handleCalendarClick(
  clickEvent: React.MouseEvent,
  dayDate: Date,
  hourHeight: number
): ClickTimeResult | null {
  const rect = (clickEvent.currentTarget as HTMLElement).getBoundingClientRect()
  const y = clickEvent.clientY - rect.top
  
  // Calcular hora basada en la posición Y
  const totalMinutes = (y / hourHeight) * 60
  const hour = Math.floor(totalMinutes / 60)
  const minute = Math.round((totalMinutes % 60) / 15) * 15 // Redondear a cada 15 min
  
  // Validar que la hora esté en rango válido
  if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
    return { hour, minute, date: dayDate }
  }
  
  return null
}

/**
 * Ejemplo de uso en componente:
 * 
 * const handleClick = (e: React.MouseEvent) => {
 *   const clickTime = handleCalendarClick(e, currentDate, HOUR_HEIGHT)
 *   if (clickTime) {
 *     // Abrir modal para crear evento en clickTime.hour:clickTime.minute
 *     openEventModal(clickTime)
 *   }
 * }
 */