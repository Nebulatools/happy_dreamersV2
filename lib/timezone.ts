// Utilidades simples para manejar zonas horarias sin dependencias externas
// Usa Intl.DateTimeFormat para obtener componentes en una zona horaria específica.

export interface TimeParts {
  date: Date
  hours: number
  minutes: number
  seconds: number
}

export function getTimePartsInTimeZone(date: Date, timeZone?: string): TimeParts {
  if (!timeZone) {
    return {
      date,
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds()
    }
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value
    return acc
  }, {})

  const zonedDate = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`
  )

  return {
    date: zonedDate,
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
    seconds: Number(parts.second)
  }
}

export function nowInTimeZone(timeZone?: string): TimeParts {
  return getTimePartsInTimeZone(new Date(), timeZone)
}
