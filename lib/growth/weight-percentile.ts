// Simplified percentile lookup for peso/edad/sexo.
// Bases aproximadas en tablas OMS, pero condensadas a bandas de edad + umbrales de peso.

type Sex = "male" | "female" | "any"

interface PercentileBand {
  maxMonths: number
  male: number[]
  female: number[]
}

// Para cada banda el arreglo representa los pesos aproximados para percentiles 10, 25, 50 y 75.
const percentileBands: PercentileBand[] = [
  {
    maxMonths: 6,
    male: [5.5, 6.5, 7.8, 9.2],
    female: [5.0, 6.0, 7.3, 8.7]
  },
  {
    maxMonths: 12,
    male: [7.0, 8.5, 10.0, 11.5],
    female: [6.5, 8.0, 9.5, 11.0]
  },
  {
    maxMonths: 24,
    male: [9.0, 10.5, 12.0, 13.5],
    female: [8.5, 10.0, 11.5, 13.0]
  },
  {
    maxMonths: 36,
    male: [11.0, 12.5, 14.0, 15.5],
    female: [10.5, 12.0, 13.5, 15.0]
  },
  {
    maxMonths: 60,
    male: [13.0, 15.0, 17.0, 19.0],
    female: [12.5, 14.0, 16.0, 18.0]
  },
  {
    maxMonths: Infinity,
    male: [16.0, 18.0, 21.0, 24.0],
    female: [15.0, 17.0, 20.0, 23.0]
  }
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function calculateWeightPercentile(weightKg: number, ageInMonths: number, sex?: string | null): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(ageInMonths) || ageInMonths < 0) {
    return null
  }

  const normalizedSex = normalizeSex(sex)
  const band = percentileBands.find((band) => ageInMonths <= band.maxMonths) || percentileBands[percentileBands.length - 1]
  const thresholds =
    normalizedSex === "male"
      ? band.male
      : normalizedSex === "female"
        ? band.female
        : band.male.map((value, index) => (value + band.female[index]) / 2)

  const [p10, p25, p50, p75] = thresholds

  if (weightKg <= p10) {
    const ratio = clamp((weightKg / p10), 0, 1)
    return Math.round(3 + ratio * 7) // 3-10
  }
  if (weightKg <= p25) {
    const ratio = (weightKg - p10) / (p25 - p10 || 1)
    return Math.round(10 + ratio * 15) // 10-25
  }
  if (weightKg <= p50) {
    const ratio = (weightKg - p25) / (p50 - p25 || 1)
    return Math.round(25 + ratio * 25) // 25-50
  }
  if (weightKg <= p75) {
    const ratio = (weightKg - p50) / (p75 - p50 || 1)
    return Math.round(50 + ratio * 25) // 50-75
  }

  const ratio = (weightKg - p75) / (p75 * 0.35 || 1) // Extiende hasta ~p90
  return Math.round(clamp(75 + ratio * 15, 75, 95))
}

export default calculateWeightPercentile
