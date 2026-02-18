// Calculo de percentil de talla (longitud) basado en tablas LMS oficiales OMS/CDC (0-24 meses)
// Usa el metodo LMS: Z = ((Y/M)^L - 1) / (L * S) cuando L != 0
// Luego convierte Z-score a percentil con CDF normal (Abramowitz & Stegun)

type Sex = "male" | "female" | "any"

// Tabla LMS: [mes, L, M, S]
type LMSRow = [number, number, number, number]

// Length-for-age BOYS (OMS, 0-24 meses)
const LENGTH_BOYS_LMS: LMSRow[] = [
  [0, 1, 49.8842, 0.03795],
  [1, 1, 54.7244, 0.03557],
  [2, 1, 58.4249, 0.03424],
  [3, 1, 61.4292, 0.03328],
  [4, 1, 63.886, 0.03257],
  [5, 1, 65.9026, 0.03204],
  [6, 1, 67.6236, 0.03165],
  [7, 1, 69.1645, 0.03139],
  [8, 1, 70.5994, 0.03124],
  [9, 1, 71.9687, 0.03117],
  [10, 1, 73.2812, 0.03118],
  [11, 1, 74.5388, 0.03125],
  [12, 1, 75.7488, 0.03137],
  [13, 1, 76.9186, 0.03154],
  [14, 1, 78.0497, 0.03174],
  [15, 1, 79.1458, 0.03197],
  [16, 1, 80.2113, 0.03222],
  [17, 1, 81.2487, 0.0325],
  [18, 1, 82.2587, 0.03279],
  [19, 1, 83.2418, 0.0331],
  [20, 1, 84.1996, 0.03342],
  [21, 1, 85.1348, 0.03376],
  [22, 1, 86.0477, 0.0341],
  [23, 1, 86.941, 0.03445],
  [24, 1, 87.8161, 0.03479],
]

// Length-for-age GIRLS (OMS, 0-24 meses)
const LENGTH_GIRLS_LMS: LMSRow[] = [
  [0, 1, 49.1477, 0.0379],
  [1, 1, 53.6872, 0.0364],
  [2, 1, 57.0673, 0.03568],
  [3, 1, 59.8029, 0.0352],
  [4, 1, 62.0899, 0.03486],
  [5, 1, 64.0301, 0.03463],
  [6, 1, 65.7311, 0.03448],
  [7, 1, 67.2873, 0.03441],
  [8, 1, 68.7498, 0.0344],
  [9, 1, 70.1435, 0.03444],
  [10, 1, 71.4818, 0.03452],
  [11, 1, 72.771, 0.03464],
  [12, 1, 74.015, 0.03479],
  [13, 1, 75.2176, 0.03496],
  [14, 1, 76.3817, 0.03514],
  [15, 1, 77.5099, 0.03534],
  [16, 1, 78.6055, 0.03555],
  [17, 1, 79.671, 0.03576],
  [18, 1, 80.7079, 0.03598],
  [19, 1, 81.7182, 0.0362],
  [20, 1, 82.7036, 0.03643],
  [21, 1, 83.6654, 0.03666],
  [22, 1, 84.604, 0.03688],
  [23, 1, 85.5202, 0.03711],
  [24, 1, 86.4153, 0.03734],
]

const normalizeSex = (sex?: string | null): Sex => {
  if (!sex) return "any"
  const normalized = sex.trim().toLowerCase()
  if (["male", "masculino", "niño", "varon", "m"].includes(normalized)) {
    return "male"
  }
  if (["female", "femenino", "niña", "mujer", "f"].includes(normalized)) {
    return "female"
  }
  return "any"
}

/**
 * Aproximacion de la CDF normal estandar (Abramowitz & Stegun).
 * Convierte un Z-score en una probabilidad acumulada [0, 1].
 */
function normalCDF(z: number): number {
  if (z < -8) return 0
  if (z > 8) return 1
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1.0 / (1.0 + p * x)
  const y =
    1.0 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1.0 + sign * y)
}

/**
 * Interpola los parametros L, M, S para una edad fraccionaria en meses.
 * Si la edad excede 24 meses, usa los datos del mes 24 como fallback.
 */
function interpolateLMS(
  table: LMSRow[],
  ageInMonths: number
): { L: number; M: number; S: number } {
  const clampedAge = Math.max(0, Math.min(ageInMonths, 24))

  const floorMonth = Math.floor(clampedAge)
  const ceilMonth = Math.ceil(clampedAge)

  if (floorMonth === ceilMonth || floorMonth >= 24) {
    const idx = Math.min(floorMonth, 24)
    const row = table[idx]
    return { L: row[1], M: row[2], S: row[3] }
  }

  const fraction = clampedAge - floorMonth
  const rowLow = table[floorMonth]
  const rowHigh = table[ceilMonth]

  return {
    L: rowLow[1] + fraction * (rowHigh[1] - rowLow[1]),
    M: rowLow[2] + fraction * (rowHigh[2] - rowLow[2]),
    S: rowLow[3] + fraction * (rowHigh[3] - rowLow[3]),
  }
}

/**
 * Calcula el Z-score usando el metodo LMS.
 * Si L != 0: Z = ((Y/M)^L - 1) / (L * S)
 * Si L == 0: Z = ln(Y/M) / S
 */
function calculateZScore(value: number, L: number, M: number, S: number): number {
  if (M <= 0 || S <= 0) return 0
  if (Math.abs(L) < 0.0001) {
    return Math.log(value / M) / S
  }
  return (Math.pow(value / M, L) - 1) / (L * S)
}

/**
 * Calcula el percentil a partir de una tabla LMS, un valor y una edad.
 */
function calculatePercentileFromTable(
  table: LMSRow[],
  value: number,
  ageInMonths: number
): number | null {
  const { L, M, S } = interpolateLMS(table, ageInMonths)
  const zScore = calculateZScore(value, L, M, S)
  const probability = normalCDF(zScore)

  const percentile = Math.round(probability * 100)
  return Math.max(1, Math.min(99, percentile))
}

/**
 * Calcula el percentil de talla (longitud) para la edad usando tablas OMS oficiales.
 * @param heightCm - Talla en centimetros
 * @param ageInMonths - Edad en meses (puede ser fraccionaria)
 * @param sex - Sexo: "male", "female", "masculino", "femenino", etc.
 * @returns Percentil (1-99) o null si los datos son invalidos
 */
export function calculateHeightPercentile(
  heightCm: number,
  ageInMonths: number,
  sex?: string | null
): number | null {
  if (
    !Number.isFinite(heightCm) ||
    heightCm <= 0 ||
    !Number.isFinite(ageInMonths) ||
    ageInMonths < 0
  ) {
    return null
  }

  const normalizedSex = normalizeSex(sex)

  if (normalizedSex === "any") {
    const pBoys = calculatePercentileFromTable(LENGTH_BOYS_LMS, heightCm, ageInMonths)
    const pGirls = calculatePercentileFromTable(LENGTH_GIRLS_LMS, heightCm, ageInMonths)
    if (pBoys === null || pGirls === null) return null
    return Math.round((pBoys + pGirls) / 2)
  }

  const table = normalizedSex === "male" ? LENGTH_BOYS_LMS : LENGTH_GIRLS_LMS
  return calculatePercentileFromTable(table, heightCm, ageInMonths)
}

export default calculateHeightPercentile
