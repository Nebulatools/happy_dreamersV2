// Funciones para aplanar surveyData anidado a formato plano
// Extraido de app/api/admin/diagnostics/[childId]/route.ts para reutilizar en triage

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasToken(values: unknown, token: string): boolean {
  if (!Array.isArray(values)) return false
  const normalizedToken = token.toLowerCase().trim()
  return values.some((value) => (
    typeof value === "string" && value.toLowerCase().trim() === normalizedToken
  ))
}

function clockPartsToMinutes(
  rawHour: string | undefined,
  rawMinute: string | undefined,
  rawMeridiem: string | undefined
): number | undefined {
  if (!rawHour) return undefined
  const hourValue = Number(rawHour)
  const minuteValue = rawMinute ? Number(rawMinute) : 0
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return undefined

  let hour = hourValue
  const meridiem = rawMeridiem?.toLowerCase()
  if (meridiem === "pm" && hour < 12) hour += 12
  if (meridiem === "am" && hour === 12) hour = 0
  if (hour < 0 || hour > 23 || minuteValue < 0 || minuteValue > 59) return undefined

  return hour * 60 + minuteValue
}

function parseMinutesFromText(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }
  if (typeof value !== "string") return undefined

  const text = value.trim().toLowerCase()
  if (!text) return undefined
  const normalized = text.replace(/,/g, ".")

  const numericOnly = normalized.match(/^(\d+(?:\.\d+)?)$/)
  if (numericOnly) {
    const parsed = Number(numericOnly[1])
    if (!Number.isFinite(parsed)) return undefined
    return Math.round(parsed > 12 ? parsed : parsed * 60)
  }

  let minutes = 0
  const hourMatches = normalized.matchAll(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hora|horas)\b/g)
  for (const match of hourMatches) {
    minutes += Math.round(Number(match[1]) * 60)
  }
  const minuteMatches = normalized.matchAll(/(\d+)\s*(m|min|mins|minuto|minutos)\b/g)
  for (const match of minuteMatches) {
    minutes += Number(match[1])
  }
  if (minutes > 0) return minutes

  const rangeMatch = normalized.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:a|hasta|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  )
  if (!rangeMatch) return undefined

  const startMinutes = clockPartsToMinutes(rangeMatch[1], rangeMatch[2], rangeMatch[3])
  const endMinutes = clockPartsToMinutes(rangeMatch[4], rangeMatch[5], rangeMatch[6] ?? rangeMatch[3])
  if (startMinutes === undefined || endMinutes === undefined) return undefined

  let diff = endMinutes - startMinutes
  if (diff <= 0) diff += 24 * 60
  if (diff <= 0 || diff > 16 * 60) return undefined
  return diff
}

// Aplanar surveyData: los datos se guardan anidados por seccion
// (ej: surveyData.desarrolloSalud.reflujoColicos) pero los motores
// de validacion acceden de forma plana (ej: surveyData.reflujoColicos).
// Esta funcion merge todas las secciones y agrega mappings especiales.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flattenSurveyData(raw: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flat: Record<string, any> = {}

  // Secciones del survey wizard
  const sections = [
    "informacionFamiliar",
    "dinamicaFamiliar",
    "historial",
    "desarrolloSalud",
    "actividadFisica",
    "rutinaHabitos",
  ]

  for (const section of sections) {
    if (raw[section] && typeof raw[section] === "object" && !Array.isArray(raw[section])) {
      Object.assign(flat, raw[section])
    }
  }

  // Pregunta 10 (problemasHijo) -> flag directo para validacion de reflujo
  if (Array.isArray(flat.problemasHijo)) {
    flat.reflujoColicos = flat.problemasHijo.includes("reflujo")
  }

  // Normalizacion de campos medicos desde checkboxes tokenizados del survey
  // Evita falsos negativos por mismatch entre tokens (survey) y campos canonicos (diagnostico).
  if (flat.ronca === undefined && hasToken(flat.problemasHijo, "ronca")) {
    flat.ronca = true
  }
  if (flat.respiraBoca === undefined && hasToken(flat.problemasHijo, "respira-boca")) {
    flat.respiraBoca = true
  }
  if (flat.sudoracionNocturna === undefined && hasToken(flat.problemasHijo, "transpira")) {
    flat.sudoracionNocturna = true
  }
  if (flat.muchaPipiNoche === undefined && hasToken(flat.problemasHijo, "moja-cama")) {
    flat.muchaPipiNoche = true
  }
  if (flat.pesadillasFinNoche === undefined && hasToken(flat.problemasHijo, "pesadillas")) {
    flat.pesadillasFinNoche = true
  }

  if (flat.infeccionesOido === undefined && hasToken(flat.situacionesHijo, "infecciones-oido")) {
    flat.infeccionesOido = true
  }
  if (
    flat.congestionNasal === undefined &&
    (hasToken(flat.situacionesHijo, "nariz-tapada") || hasToken(flat.situacionesHijo, "rinitis"))
  ) {
    flat.congestionNasal = true
  }
  if (flat.dermatitisEczema === undefined && hasToken(flat.situacionesHijo, "dermatitis")) {
    flat.dermatitisEczema = true
  }
  if (flat.irritable === undefined && raw.actividadFisica?.signosIrritabilidad !== undefined) {
    flat.irritable = raw.actividadFisica.signosIrritabilidad === true
  }

  // Campos derivados desde texto cuando no hay captura estructurada explicita.
  if (flat.tardaDormirse === undefined) {
    const sleepOnsetMinutes = parseMinutesFromText(flat.tiempoDormir)
    if (sleepOnsetMinutes !== undefined) {
      flat.tardaDormirse = sleepOnsetMinutes > 30
    }
  }

  if (flat.screenTime === undefined) {
    const legacyMinutes = parseMinutesFromText(flat.pantallasTiempo)
    const detailMinutes = parseMinutesFromText(flat.pantallasDetalle)
    if (legacyMinutes !== undefined) {
      flat.screenTime = legacyMinutes
    } else if (detailMinutes !== undefined) {
      flat.screenTime = detailMinutes
    } else if (flat.vePantallas === false) {
      flat.screenTime = 0
    }
  }

  // Mappings especiales para G4 (nombres de campo distintos al form)
  // roomTemperature <- temperaturaCuarto
  if (flat.temperaturaCuarto !== undefined) {
    const parsed = parseFloat(flat.temperaturaCuarto)
    if (!isNaN(parsed)) flat.roomTemperature = parsed
  }

  // sleepingArrangement <- dondeDuerme (puede ser string o array)
  if (flat.dondeDuerme !== undefined) {
    flat.sleepingArrangement = Array.isArray(flat.dondeDuerme)
      ? flat.dondeDuerme.join(", ")
      : flat.dondeDuerme
  }

  // sharesRoom <- comparteHabitacion
  if (flat.comparteHabitacion !== undefined) {
    flat.sharesRoom = flat.comparteHabitacion
  }

  // Legacy: conQuienComparte -> comparteHabitacionCon
  if (flat.comparteHabitacionCon === undefined && flat.conQuienComparte !== undefined) {
    flat.comparteHabitacionCon = flat.conQuienComparte
  }

  // recentChanges <- principalPreocupacion (texto libre)
  if (flat.principalPreocupacion !== undefined) {
    flat.recentChanges = flat.principalPreocupacion
  }

  // postpartumDepression <- informacionFamiliar.mama.pensamientosNegativos
  if (raw.informacionFamiliar?.mama?.pensamientosNegativos !== undefined) {
    flat.postpartumDepression = raw.informacionFamiliar.mama.pensamientosNegativos
  }

  // alergiasPadres <- papa.tieneAlergias OR mama.tieneAlergias
  const papaAlergias = raw.informacionFamiliar?.papa?.tieneAlergias
  const mamaAlergias = raw.informacionFamiliar?.mama?.tieneAlergias
  if (papaAlergias || mamaAlergias) {
    flat.alergiasPadres = true
  }

  // maternalSleep <- informacionFamiliar.mama.puedeDormir
  if (raw.informacionFamiliar?.mama?.puedeDormir !== undefined) {
    flat.maternalSleep = raw.informacionFamiliar.mama.puedeDormir
  }

  // nighttimeSupport <- dinamicaFamiliar.quienAtiende
  if (flat.quienAtiende !== undefined) {
    flat.nighttimeSupport = flat.quienAtiende
  }

  // householdMembers <- dinamicaFamiliar.otrosResidentes
  if (flat.otrosResidentes !== undefined) {
    flat.householdMembers = flat.otrosResidentes
  }

  // Derivar campos planos desde arrays estructurados para compatibilidad G1/G3
  if (Array.isArray(flat.siestasDetalle) && flat.siestasDetalle.length > 0) {
    flat.numeroSiestas = String(flat.siestasDetalle.length)
    flat.tomaSiestas = true
  }
  if (flat.horaDespertarManana && !flat.horaDespertar) {
    // Mapear nombre nuevo al que G1 espera
    flat.horaDespertar = flat.horaDespertarManana
  }
  if (Array.isArray(flat.comidasSolidasDetalle) && flat.comidasSolidasDetalle.length > 0) {
    flat.numeroComidasSolidas = flat.comidasSolidasDetalle.length
    flat.comeSolidos = true
  }
  if (Array.isArray(flat.tomasLecheDetalle) && flat.tomasLecheDetalle.length > 0) {
    flat.numeroTomasLeche = flat.tomasLecheDetalle.length
  }

  return flat
}
