// Tests exhaustivos para percentiles OMS de peso y talla (0-24 meses)
import { calculateWeightPercentile } from "@/lib/growth/weight-percentile"
import { calculateHeightPercentile } from "@/lib/growth/height-percentile"

// ============================================================
// WEIGHT PERCENTILE TESTS
// ============================================================

describe("calculateWeightPercentile", () => {
  // --- Casos normales: mediana (~50 percentil) ---

  test("1. Nino recien nacido (0 meses, 3.3kg, male) -> ~50 percentil", () => {
    const result = calculateWeightPercentile(3.3464, 0, "male")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  test("2. Nina recien nacida (0 meses, 3.2kg, female) -> ~50 percentil", () => {
    const result = calculateWeightPercentile(3.2322, 0, "female")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  test("3. Nino 12 meses, 9.6kg -> ~50 percentil", () => {
    const result = calculateWeightPercentile(9.6479, 12, "male")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  test("4. Nina 12 meses, 8.9kg -> ~50 percentil", () => {
    const result = calculateWeightPercentile(8.9481, 12, "female")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  // --- Extremos ---

  test("5. Nino 6 meses, peso bajo (5.5kg) -> < 3 percentil", () => {
    const result = calculateWeightPercentile(5.5, 6, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeLessThanOrEqual(3)
  })

  test("6. Nino 6 meses, peso alto (11kg) -> > 97 percentil", () => {
    const result = calculateWeightPercentile(11, 6, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(97)
  })

  // --- Interpolacion ---

  test("7. Edad fraccionaria (6.5 meses) debe interpolar entre mes 6 y 7", () => {
    // Mediana mes 6 boys = 7.934, mes 7 = 8.297 -> interpolada ~8.1155
    const result = calculateWeightPercentile(8.1155, 6.5, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(48)
    expect(result!).toBeLessThanOrEqual(52)
  })

  // --- Normalizacion de sexo ---

  test('8. Sexo "masculino" (espanol) debe normalizar a male', () => {
    const resultEs = calculateWeightPercentile(3.3464, 0, "masculino")
    const resultEn = calculateWeightPercentile(3.3464, 0, "male")
    expect(resultEs).toBe(resultEn)
  })

  test("9. Sexo null -> debe usar promedio male/female", () => {
    const result = calculateWeightPercentile(3.3, 0, null)
    expect(result).not.toBeNull()
    // Debe ser un promedio razonable
    expect(result!).toBeGreaterThanOrEqual(1)
    expect(result!).toBeLessThanOrEqual(99)

    // El resultado debe ser diferente de solo male o solo female (promedio)
    const male = calculateWeightPercentile(3.3, 0, "male")
    const female = calculateWeightPercentile(3.3, 0, "female")
    expect(result).toBe(Math.round((male! + female!) / 2))
  })

  // --- Datos invalidos ---

  test("10. Peso negativo -> debe retornar null", () => {
    expect(calculateWeightPercentile(-1, 6, "male")).toBeNull()
  })

  test("11. Peso 0 -> debe retornar null", () => {
    expect(calculateWeightPercentile(0, 6, "male")).toBeNull()
  })

  test("12. Edad negativa -> debe retornar null", () => {
    expect(calculateWeightPercentile(7, -1, "male")).toBeNull()
  })

  test("13. Edad > 24 meses -> debe usar fallback mes 24", () => {
    // Mediana mes 24 boys = 12.1515
    const result = calculateWeightPercentile(12.1515, 30, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(48)
    expect(result!).toBeLessThanOrEqual(52)
  })

  test("14. Resultado siempre entre 1 y 99", () => {
    // Peso extremadamente bajo
    const low = calculateWeightPercentile(0.5, 12, "male")
    expect(low).not.toBeNull()
    expect(low!).toBeGreaterThanOrEqual(1)

    // Peso extremadamente alto
    const high = calculateWeightPercentile(25, 12, "male")
    expect(high).not.toBeNull()
    expect(high!).toBeLessThanOrEqual(99)
  })

  // --- Inputs invalidos adicionales ---

  test("Peso NaN -> null", () => {
    expect(calculateWeightPercentile(NaN, 6, "male")).toBeNull()
  })

  test("Peso Infinity -> null", () => {
    expect(calculateWeightPercentile(Infinity, 6, "male")).toBeNull()
  })

  test("Edad NaN -> null", () => {
    expect(calculateWeightPercentile(7, NaN, "male")).toBeNull()
  })
})

// ============================================================
// HEIGHT PERCENTILE TESTS
// ============================================================

describe("calculateHeightPercentile", () => {
  // --- Casos normales: mediana (~50 percentil) ---

  test("15. Nino recien nacido (0 meses, 49.9cm, male) -> ~50 percentil", () => {
    const result = calculateHeightPercentile(49.8842, 0, "male")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  test("16. Nina recien nacida (0 meses, 49.1cm, female) -> ~50 percentil", () => {
    const result = calculateHeightPercentile(49.1477, 0, "female")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  test("17. Nino 12 meses, 75.7cm -> ~50 percentil", () => {
    const result = calculateHeightPercentile(75.7488, 12, "male")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  test("18. Nina 12 meses, 74cm -> ~50 percentil", () => {
    const result = calculateHeightPercentile(74.015, 12, "female")
    expect(result).toBeGreaterThanOrEqual(48)
    expect(result).toBeLessThanOrEqual(52)
  })

  // --- Extremos ---

  test("19. Talla extrema baja -> percentil bajo (< 5)", () => {
    // Nino 12 meses, 68cm (muy bajo)
    const result = calculateHeightPercentile(68, 12, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeLessThanOrEqual(5)
  })

  test("20. Talla extrema alta -> percentil alto (> 95)", () => {
    // Nino 12 meses, 83cm (muy alto)
    const result = calculateHeightPercentile(83, 12, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(95)
  })

  // --- Datos invalidos ---

  test("21. Altura negativa -> null", () => {
    expect(calculateHeightPercentile(-5, 6, "male")).toBeNull()
  })

  test("Altura 0 -> null", () => {
    expect(calculateHeightPercentile(0, 6, "male")).toBeNull()
  })

  // --- Interpolacion ---

  test("22. Edad fraccionaria -> interpola correctamente", () => {
    // Mediana mes 6 boys = 67.6236, mes 7 = 69.1645 -> interpolada ~68.394
    const result = calculateHeightPercentile(68.394, 6.5, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(48)
    expect(result!).toBeLessThanOrEqual(52)
  })

  // --- Normalizacion de sexo para height ---

  test('Sexo "femenino" (espanol) debe normalizar a female', () => {
    const resultEs = calculateHeightPercentile(49.1477, 0, "femenino")
    const resultEn = calculateHeightPercentile(49.1477, 0, "female")
    expect(resultEs).toBe(resultEn)
  })

  test("Sexo null -> usa promedio", () => {
    const result = calculateHeightPercentile(50, 0, null)
    const male = calculateHeightPercentile(50, 0, "male")
    const female = calculateHeightPercentile(50, 0, "female")
    expect(result).toBe(Math.round((male! + female!) / 2))
  })

  test("Edad > 24 meses -> usa fallback mes 24", () => {
    const result = calculateHeightPercentile(87.8161, 30, "male")
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(48)
    expect(result!).toBeLessThanOrEqual(52)
  })

  test("Resultado siempre entre 1 y 99", () => {
    const low = calculateHeightPercentile(30, 12, "male")
    expect(low).not.toBeNull()
    expect(low!).toBeGreaterThanOrEqual(1)

    const high = calculateHeightPercentile(110, 12, "male")
    expect(high).not.toBeNull()
    expect(high!).toBeLessThanOrEqual(99)
  })
})

// ============================================================
// VALIDACION CRUZADA CON TABLAS OMS
// ============================================================

describe("Validacion cruzada: mediana OMS da ~50 percentil", () => {
  // Medianas de peso boys (M de tabla LMS)
  const boysWeightMedians: [number, number][] = [
    [0, 3.3464], [1, 4.4709], [2, 5.5675], [3, 6.3762], [4, 7.0023],
    [5, 7.5105], [6, 7.934], [7, 8.297], [8, 8.6151], [9, 8.9014],
    [10, 9.1649], [11, 9.4122], [12, 9.6479], [13, 9.8749], [14, 10.0953],
    [15, 10.3108], [16, 10.5228], [17, 10.7319], [18, 10.9385], [19, 11.143],
    [20, 11.3462], [21, 11.5486], [22, 11.7504], [23, 11.9514], [24, 12.1515],
  ]

  test("23. Mediana boys weight da ~50 para cada mes 0-24", () => {
    for (const [month, median] of boysWeightMedians) {
      const result = calculateWeightPercentile(median, month, "male")
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThanOrEqual(48)
      expect(result!).toBeLessThanOrEqual(52)
    }
  })

  // Medianas de peso girls
  const girlsWeightMedians: [number, number][] = [
    [0, 3.2322], [1, 4.1873], [2, 5.1282], [3, 5.8458], [4, 6.4237],
    [5, 6.8985], [6, 7.297], [7, 7.6422], [8, 7.9487], [9, 8.2254],
    [10, 8.48], [11, 8.7192], [12, 8.9481], [13, 9.1699], [14, 9.387],
    [15, 9.6008], [16, 9.8124], [17, 10.0226], [18, 10.2315], [19, 10.4393],
    [20, 10.6464], [21, 10.8534], [22, 11.0608], [23, 11.2688], [24, 11.4775],
  ]

  test("24. Mediana girls weight da ~50 para cada mes 0-24", () => {
    for (const [month, median] of girlsWeightMedians) {
      const result = calculateWeightPercentile(median, month, "female")
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThanOrEqual(48)
      expect(result!).toBeLessThanOrEqual(52)
    }
  })
})
