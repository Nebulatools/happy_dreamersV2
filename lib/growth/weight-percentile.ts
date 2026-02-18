// Calculo de percentil de peso basado en tablas LMS oficiales OMS/CDC (0-24 meses)
// Usa el metodo LMS: Z = ((Y/M)^L - 1) / (L * S) cuando L != 0
// Luego convierte Z-score a percentil con CDF normal (Abramowitz & Stegun)

type Sex = "male" | "female" | "any"

// Tabla LMS: [mes, L, M, S]
type LMSRow = [number, number, number, number]

// Weight-for-age BOYS (OMS, 0-24 meses)
const WEIGHT_BOYS_LMS: LMSRow[] = [
  [0, 0.3487, 3.3464, 0.14602],
  [1, 0.2297, 4.4709, 0.13395],
  [2, 0.197, 5.5675, 0.12385],
  [3, 0.1738, 6.3762, 0.11727],
  [4, 0.1553, 7.0023, 0.11316],
  [5, 0.1395, 7.5105, 0.1108],
  [6, 0.1257, 7.934, 0.10958],
  [7, 0.1134, 8.297, 0.10902],
  [8, 0.1021, 8.6151, 0.10882],
  [9, 0.0917, 8.9014, 0.10881],
  [10, 0.082, 9.1649, 0.10891],
  [11, 0.073, 9.4122, 0.10906],
  [12, 0.0644, 9.6479, 0.10925],
  [13, 0.0563, 9.8749, 0.10949],
  [14, 0.0487, 10.0953, 0.10976],
  [15, 0.0413, 10.3108, 0.11007],
  [16, 0.0343, 10.5228, 0.11041],
  [17, 0.0275, 10.7319, 0.11079],
  [18, 0.0211, 10.9385, 0.11119],
  [19, 0.0148, 11.143, 0.11164],
  [20, 0.0087, 11.3462, 0.11211],
  [21, 0.0029, 11.5486, 0.11261],
  [22, -0.0028, 11.7504, 0.11314],
  [23, -0.0083, 11.9514, 0.11369],
  [24, -0.0137, 12.1515, 0.11426],
]

// Weight-for-age GIRLS (OMS, 0-24 meses)
const WEIGHT_GIRLS_LMS: LMSRow[] = [
  [0, 0.3809, 3.2322, 0.14171],
  [1, 0.1714, 4.1873, 0.13724],
  [2, 0.0962, 5.1282, 0.13],
  [3, 0.0402, 5.8458, 0.12619],
  [4, -0.005, 6.4237, 0.12402],
  [5, -0.043, 6.8985, 0.12274],
  [6, -0.0756, 7.297, 0.12204],
  [7, -0.1039, 7.6422, 0.12178],
  [8, -0.1288, 7.9487, 0.12181],
  [9, -0.1507, 8.2254, 0.12199],
  [10, -0.17, 8.48, 0.12223],
  [11, -0.1872, 8.7192, 0.12247],
  [12, -0.2024, 8.9481, 0.12268],
  [13, -0.2158, 9.1699, 0.12283],
  [14, -0.2278, 9.387, 0.12294],
  [15, -0.2384, 9.6008, 0.12299],
  [16, -0.2478, 9.8124, 0.12303],
  [17, -0.2562, 10.0226, 0.12306],
  [18, -0.2637, 10.2315, 0.12309],
  [19, -0.2703, 10.4393, 0.12315],
  [20, -0.2762, 10.6464, 0.12323],
  [21, -0.2815, 10.8534, 0.12335],
  [22, -0.2862, 11.0608, 0.1235],
  [23, -0.2903, 11.2688, 0.12369],
  [24, -0.2941, 11.4775, 0.1239],
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
  // Clamp a rango valido
  const clampedAge = Math.max(0, Math.min(ageInMonths, 24))

  const floorMonth = Math.floor(clampedAge)
  const ceilMonth = Math.ceil(clampedAge)

  // Si es exacto o fuera de rango, retornar directamente
  if (floorMonth === ceilMonth || floorMonth >= 24) {
    const idx = Math.min(floorMonth, 24)
    const row = table[idx]
    return { L: row[1], M: row[2], S: row[3] }
  }

  // Interpolacion lineal entre los dos meses adyacentes
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
    // L aproximadamente 0, usar formula logaritmica
    return Math.log(value / M) / S
  }
  return (Math.pow(value / M, L) - 1) / (L * S)
}

/**
 * Calcula el percentil de peso para la edad usando tablas OMS oficiales.
 * @param weightKg - Peso en kilogramos
 * @param ageInMonths - Edad en meses (puede ser fraccionaria)
 * @param sex - Sexo: "male", "female", "masculino", "femenino", etc.
 * @returns Percentil (1-99) o null si los datos son invalidos
 */
export function calculateWeightPercentile(
  weightKg: number,
  ageInMonths: number,
  sex?: string | null
): number | null {
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Number.isFinite(ageInMonths) ||
    ageInMonths < 0
  ) {
    return null
  }

  const normalizedSex = normalizeSex(sex)

  // Si el sexo no se puede determinar, promediar ambos percentiles
  if (normalizedSex === "any") {
    const pBoys = calculatePercentileFromTable(WEIGHT_BOYS_LMS, weightKg, ageInMonths)
    const pGirls = calculatePercentileFromTable(WEIGHT_GIRLS_LMS, weightKg, ageInMonths)
    if (pBoys === null || pGirls === null) return null
    return Math.round((pBoys + pGirls) / 2)
  }

  const table = normalizedSex === "male" ? WEIGHT_BOYS_LMS : WEIGHT_GIRLS_LMS
  return calculatePercentileFromTable(table, weightKg, ageInMonths)
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

  // Convertir a percentil y clampar entre 1 y 99
  const percentile = Math.round(probability * 100)
  return Math.max(1, Math.min(99, percentile))
}

export default calculateWeightPercentile
