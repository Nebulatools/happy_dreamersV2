/**
 * Tests para los fallbacks de surveyData en schedule-rules.ts
 * Verifica que validateNightDuration, validateNapCount, validateNapDuration
 * y validateSchedule usen surveyData como fallback cuando no hay eventos.
 */

import { validateSchedule, ScheduleValidationInput } from "@/lib/diagnostic/rules/schedule-rules"

// Mock de sleep-calculations para controlar las estadisticas
jest.mock("@/lib/sleep-calculations", () => ({
  processSleepStatistics: jest.fn().mockReturnValue({
    avgSleepDuration: 0,
    avgNapDuration: 0,
    avgBedtime: "--:--",
    avgSleepTime: "--:--",
    avgWakeTime: "--:--",
    bedtimeVariation: 0,
    bedtimeToSleepDifference: "0",
    avgNapSleepDelay: "0",
    totalWakeups: 0,
    avgWakeupsPerNight: 0,
    avgNightWakingDuration: 0,
    totalSleepHours: 0,
    totalEvents: 0,
    recentEvents: 0,
    sleepEvents: 0,
    napEvents: 0,
    avgSleepDurationMinutes: 0,
    avgWakeTimeMinutes: 0,
    dominantMood: "",
    emotionalStates: {},
  }),
  aggregateDailySleep: jest.fn().mockReturnValue({
    daysInPeriod: 7,
    daysWithData: 0,
    nightsCount: 0,
    napsCount: 0,
    totalNightMinutes: 0,
    totalNapMinutes: 0,
    avgNightHoursPerDay: 0,
    avgNapHoursPerDay: 0,
    avgTotalHoursPerDay: 0,
    nightPercentage: 0,
    napPercentage: 0,
    dailyTotals: [],
  }),
  calculateMorningWakeTime: jest.fn().mockReturnValue("--:--"),
  SleepEvent: {},
}))

// Importar los mocks para poder cambiarlos por test
const sleepCalc = jest.requireMock("@/lib/sleep-calculations")

describe("Schedule Rules - Survey Fallbacks", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Resetear mocks a valores "sin datos"
    sleepCalc.aggregateDailySleep.mockReturnValue({
      daysInPeriod: 7,
      daysWithData: 0,
      nightsCount: 0,
      napsCount: 0,
      totalNightMinutes: 0,
      totalNapMinutes: 0,
      avgNightHoursPerDay: 0,
      avgNapHoursPerDay: 0,
      avgTotalHoursPerDay: 0,
      nightPercentage: 0,
      napPercentage: 0,
      dailyTotals: [],
    })
    sleepCalc.processSleepStatistics.mockReturnValue({
      avgSleepDuration: 0,
      avgNapDuration: 0,
      avgBedtime: "--:--",
      avgSleepTime: "--:--",
      avgWakeTime: "--:--",
      bedtimeVariation: 0,
      bedtimeToSleepDifference: "0",
      avgNapSleepDelay: "0",
      totalWakeups: 0,
      avgWakeupsPerNight: 0,
      avgNightWakingDuration: 0,
      totalSleepHours: 0,
      totalEvents: 0,
      recentEvents: 0,
      sleepEvents: 0,
      napEvents: 0,
      avgSleepDurationMinutes: 0,
      avgWakeTimeMinutes: 0,
      dominantMood: "",
      emotionalStates: {},
    })
    sleepCalc.calculateMorningWakeTime.mockReturnValue("--:--")
  })

  // Helpers
  const baseInput = (overrides?: Partial<ScheduleValidationInput>): ScheduleValidationInput => ({
    events: [],
    plan: null,
    childAgeMonths: 12, // 12 meses: espera 2 siestas, noche 11 hrs, napMaxDuration 60
    ...overrides,
  })

  // ============================================================================
  // validateNightDuration fallback
  // ============================================================================
  describe("validateNightDuration fallback", () => {
    test("1. Sin eventos y sin surveyData -> warning sin datos", () => {
      const result = validateSchedule(baseInput())
      const nightCriterion = result.criteria.find((c) => c.id === "g1_night_duration")

      expect(nightCriterion).toBeDefined()
      expect(nightCriterion!.status).toBe("warning")
      expect(nightCriterion!.dataAvailable).toBe(false)
      expect(nightCriterion!.message).toContain("Sin datos suficientes")
    })

    test("2. Sin eventos pero con surveyData horaDormir/horaDespertar -> usa fallback", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            horaDormir: "21:00",
            horaDespertar: "07:00",
          },
        })
      )
      const nightCriterion = result.criteria.find((c) => c.id === "g1_night_duration")

      expect(nightCriterion).toBeDefined()
      expect(nightCriterion!.dataAvailable).toBe(true)
      expect(nightCriterion!.sourceType).toBe("survey")
      // 21:00 -> 07:00 = 10 horas
      expect(nightCriterion!.value).toBe("10.0 hrs")
      expect(nightCriterion!.message).toContain("cuestionario inicial")
    })

    test("3. Con eventos suficientes -> NO usa surveyData", () => {
      // Simular que hay datos de eventos
      sleepCalc.aggregateDailySleep.mockReturnValue({
        daysInPeriod: 7,
        daysWithData: 5,
        nightsCount: 5,
        napsCount: 10,
        totalNightMinutes: 3300,
        totalNapMinutes: 600,
        avgNightHoursPerDay: 11,
        avgNapHoursPerDay: 2,
        avgTotalHoursPerDay: 13,
        nightPercentage: 85,
        napPercentage: 15,
        dailyTotals: [],
      })

      const result = validateSchedule(
        baseInput({
          surveyData: {
            horaDormir: "23:00",
            horaDespertar: "05:00",
          },
        })
      )
      const nightCriterion = result.criteria.find((c) => c.id === "g1_night_duration")

      expect(nightCriterion).toBeDefined()
      // Debe usar eventos (11 hrs), no survey (6 hrs)
      expect(nightCriterion!.sourceType).toBe("calculated")
      expect(nightCriterion!.value).toBe("11.0 hrs")
    })

    test("4. Sin eventos suficientes y con surveyData cruzando medianoche -> calcula bien", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            horaDormir: "22:00",
            horaDespertar: "06:00",
          },
        })
      )
      const nightCriterion = result.criteria.find((c) => c.id === "g1_night_duration")

      expect(nightCriterion).toBeDefined()
      expect(nightCriterion!.dataAvailable).toBe(true)
      expect(nightCriterion!.sourceType).toBe("survey")
      // 22:00 -> 06:00 = 8 horas
      expect(nightCriterion!.value).toBe("8.0 hrs")
    })
  })

  // ============================================================================
  // validateNapCount fallback
  // ============================================================================
  describe("validateNapCount fallback", () => {
    test("5. Sin eventos y sin surveyData -> warning sin datos", () => {
      const result = validateSchedule(baseInput())
      const napCountCriterion = result.criteria.find((c) => c.id === "g1_nap_count")

      expect(napCountCriterion).toBeDefined()
      // Sin datos de eventos y sin survey -> no hay fallback, usa calculo normal (0 naps)
      expect(napCountCriterion!.dataAvailable).toBe(false)
    })

    test("6. Sin eventos pero con surveyData tomaSiestas=true y numeroSiestas=2 -> usa fallback", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            tomaSiestas: true,
            numeroSiestas: "2",
          },
        })
      )
      const napCountCriterion = result.criteria.find((c) => c.id === "g1_nap_count")

      expect(napCountCriterion).toBeDefined()
      expect(napCountCriterion!.dataAvailable).toBe(true)
      expect(napCountCriterion!.sourceType).toBe("survey")
      expect(napCountCriterion!.value).toBe(2)
      // Para 12 meses, espera 2 siestas -> deviation 0
      expect(napCountCriterion!.message).toContain("cuestionario inicial")
    })

    test("7. Sin eventos pero con surveyData tomaSiestas=false -> indica 0 siestas", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            tomaSiestas: false,
          },
        })
      )
      const napCountCriterion = result.criteria.find((c) => c.id === "g1_nap_count")

      expect(napCountCriterion).toBeDefined()
      expect(napCountCriterion!.dataAvailable).toBe(true)
      expect(napCountCriterion!.sourceType).toBe("survey")
      expect(napCountCriterion!.value).toBe(0)
      // Para 12 meses espera 2 siestas, reporta 0 -> warning
      expect(napCountCriterion!.status).toBe("warning")
      expect(napCountCriterion!.message).toContain("0 siestas reportadas")
    })

    test("7b. Sin eventos pero con surveyData tomaSiestas='no' (string) -> indica 0 siestas", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            tomaSiestas: "no",
          },
        })
      )
      const napCountCriterion = result.criteria.find((c) => c.id === "g1_nap_count")

      expect(napCountCriterion).toBeDefined()
      expect(napCountCriterion!.value).toBe(0)
      expect(napCountCriterion!.sourceType).toBe("survey")
    })

    test("8. Con eventos de nap -> usa eventos, ignora survey", () => {
      sleepCalc.aggregateDailySleep.mockReturnValue({
        daysInPeriod: 7,
        daysWithData: 5,
        nightsCount: 5,
        napsCount: 8,
        totalNightMinutes: 3300,
        totalNapMinutes: 480,
        avgNightHoursPerDay: 11,
        avgNapHoursPerDay: 1.6,
        avgTotalHoursPerDay: 12.6,
        nightPercentage: 87,
        napPercentage: 13,
        dailyTotals: [],
      })

      const result = validateSchedule(
        baseInput({
          surveyData: {
            tomaSiestas: true,
            numeroSiestas: "5", // Valor alto que no deberia usarse
          },
        })
      )
      const napCountCriterion = result.criteria.find((c) => c.id === "g1_nap_count")

      expect(napCountCriterion).toBeDefined()
      // 8 naps / 5 days = 1.6, redondeado = 2
      expect(napCountCriterion!.sourceType).toBe("calculated")
      expect(napCountCriterion!.value).toBe(2)
    })
  })

  // ============================================================================
  // validateNapDuration fallback
  // ============================================================================
  describe("validateNapDuration fallback", () => {
    test("9. Sin eventos y sin surveyData -> warning sin datos", () => {
      const result = validateSchedule(baseInput())
      const napDurationCriterion = result.criteria.find((c) => c.id === "g1_nap_duration")

      expect(napDurationCriterion).toBeDefined()
      expect(napDurationCriterion!.status).toBe("warning")
      expect(napDurationCriterion!.dataAvailable).toBe(false)
      expect(napDurationCriterion!.message).toContain("Sin datos")
    })

    test("10. Sin eventos pero con surveyData duracionTotalSiestas=90 -> usa fallback", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            duracionTotalSiestas: "90",
          },
        })
      )
      const napDurationCriterion = result.criteria.find((c) => c.id === "g1_nap_duration")

      expect(napDurationCriterion).toBeDefined()
      expect(napDurationCriterion!.dataAvailable).toBe(true)
      expect(napDurationCriterion!.sourceType).toBe("survey")
      expect(napDurationCriterion!.value).toBe("90 min")
      // Para 12 meses, napMaxDuration = 60 min -> 90 > 60, warning
      expect(napDurationCriterion!.status).toBe("warning")
      expect(napDurationCriterion!.message).toContain("cuestionario inicial")
    })

    test("10b. Sin eventos pero con duracionTotalSiestas=45 (dentro del limite) -> ok", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            duracionTotalSiestas: "45",
          },
        })
      )
      const napDurationCriterion = result.criteria.find((c) => c.id === "g1_nap_duration")

      expect(napDurationCriterion).toBeDefined()
      expect(napDurationCriterion!.status).toBe("ok")
      expect(napDurationCriterion!.sourceType).toBe("survey")
      expect(napDurationCriterion!.message).toContain("dentro del limite")
    })

    test("11. Con eventos -> usa eventos, ignora survey", () => {
      sleepCalc.processSleepStatistics.mockReturnValue({
        avgSleepDuration: 10,
        avgNapDuration: 0.75, // 45 minutos
        avgBedtime: "20:30",
        avgSleepTime: "20:45",
        avgWakeTime: "07:00",
        bedtimeVariation: 15,
        bedtimeToSleepDifference: "15",
        avgNapSleepDelay: "5",
        totalWakeups: 2,
        avgWakeupsPerNight: 0.4,
        avgNightWakingDuration: 10,
        totalSleepHours: 11.5,
        totalEvents: 20,
        recentEvents: 15,
        sleepEvents: 5,
        napEvents: 10,
        avgSleepDurationMinutes: 600,
        avgWakeTimeMinutes: 420,
        dominantMood: "calm",
        emotionalStates: { calm: 8 },
      })

      const result = validateSchedule(
        baseInput({
          surveyData: {
            duracionTotalSiestas: "180", // No deberia usarse
          },
        })
      )
      const napDurationCriterion = result.criteria.find((c) => c.id === "g1_nap_duration")

      expect(napDurationCriterion).toBeDefined()
      expect(napDurationCriterion!.sourceType).toBe("calculated")
      // 0.75 hrs * 60 = 45 min
      expect(napDurationCriterion!.value).toBe("45 min")
    })
  })

  // ============================================================================
  // Integracion: validateSchedule pasa surveyData a subfunciones
  // ============================================================================
  describe("Integracion - validateSchedule con surveyData", () => {
    test("12. validateSchedule pasa surveyData a todas las subfunciones", () => {
      const surveyData = {
        horaDormir: "20:30",
        horaDespertar: "06:30",
        tomaSiestas: true,
        numeroSiestas: "2",
        duracionTotalSiestas: "90",
      }

      const result = validateSchedule(baseInput({ surveyData }))

      // Verificar que cada criterio que usa survey lo tiene
      const nightDuration = result.criteria.find((c) => c.id === "g1_night_duration")
      const napCount = result.criteria.find((c) => c.id === "g1_nap_count")
      const napDuration = result.criteria.find((c) => c.id === "g1_nap_duration")
      const bedtime = result.criteria.find((c) => c.id === "g1_bedtime")
      const wakeDeviation = result.criteria.find((c) => c.id === "g1_wake_deviation")

      // Todos deben tener sourceType "survey" porque no hay eventos
      expect(nightDuration!.sourceType).toBe("survey")
      expect(napCount!.sourceType).toBe("survey")
      expect(napDuration!.sourceType).toBe("survey")

      // bedtime: sin actualBedtime (mock retorna "--:--"), pero usa horaDormir como expected
      // El expected viene del survey, asi que debe tener el valor del survey
      expect(bedtime!.expected).toBe("20:30")

      // wakeDeviation: sin actualWakeTime, pero usa horaDespertar como expected
      expect(wakeDeviation!.expected).toBe("06:30")
    })

    test("13. validateSchedule sin surveyData -> multiples warnings", () => {
      const result = validateSchedule(baseInput())

      // Debe haber varios criterios con dataAvailable=false
      const unavailable = result.criteria.filter((c) => !c.dataAvailable)
      expect(unavailable.length).toBeGreaterThanOrEqual(3)
    })

    test("14. El resultado extendido contiene valores correctos con survey fallback", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            horaDormir: "21:00",
            horaDespertar: "07:00",
            tomaSiestas: true,
            numeroSiestas: "1",
            duracionTotalSiestas: "50",
          },
        })
      )

      // El status general deberia reflejar los warnings del survey
      expect(result.groupId).toBe("G1")
      expect(result.groupName).toBe("Horario")
      expect(result.criteria.length).toBe(7)
      // Verificar que dataCompleteness refleja datos disponibles
      expect(result.dataCompleteness.available).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Casos borde
  // ============================================================================
  describe("Casos borde", () => {
    test("surveyData con valores invalidos (horaDormir vacio) -> no usa fallback", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            horaDormir: "",
            horaDespertar: "",
          },
        })
      )
      const nightCriterion = result.criteria.find((c) => c.id === "g1_night_duration")

      expect(nightCriterion!.dataAvailable).toBe(false)
    })

    test("surveyData con numeroSiestas no numerico -> no usa fallback de nap count", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            tomaSiestas: true,
            numeroSiestas: "varias",
          },
        })
      )
      const napCountCriterion = result.criteria.find((c) => c.id === "g1_nap_count")

      // "varias" no es numerico -> isNaN, no entra al fallback de numeroSiestas
      // Pero tomaSiestas=true y numeroSiestas no numerico: no cumple la condicion
      // Deberia caer al caso sin datos
      expect(napCountCriterion!.dataAvailable).toBe(false)
    })

    test("bebe muy pequeno (2 meses) con napCount=-1 -> retorna Variable", () => {
      const result = validateSchedule(baseInput({ childAgeMonths: 2 }))
      const napCountCriterion = result.criteria.find((c) => c.id === "g1_nap_count")

      expect(napCountCriterion).toBeDefined()
      expect(napCountCriterion!.value).toBe("Variable")
      expect(napCountCriterion!.status).toBe("ok")
    })

    test("bebe muy pequeno (2 meses) con napMaxDuration=-1 -> retorna Variable", () => {
      const result = validateSchedule(baseInput({ childAgeMonths: 2 }))
      const napDurationCriterion = result.criteria.find((c) => c.id === "g1_nap_duration")

      expect(napDurationCriterion).toBeDefined()
      expect(napDurationCriterion!.value).toBe("Variable")
      expect(napDurationCriterion!.status).toBe("ok")
    })

    test("surveyData con duracionTotalSiestas=0 -> no usa fallback (valor 0 no es > 0)", () => {
      const result = validateSchedule(
        baseInput({
          surveyData: {
            duracionTotalSiestas: "0",
          },
        })
      )
      const napDurationCriterion = result.criteria.find((c) => c.id === "g1_nap_duration")

      // 0 no es > 0, entonces cae al caso sin datos
      expect(napDurationCriterion!.dataAvailable).toBe(false)
    })
  })
})
