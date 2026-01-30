/**
 * Tests para el generador de narrativas
 *
 * Verifica que generateNarrative produce oraciones correctas en espanol
 * para cada tipo de evento, siguiendo las reglas del spec:
 * - Alimentacion Pecho: "[Nombre] tomo pecho por [X] minutos"
 * - Alimentacion Biberon: "[Nombre] tomo [X] ml de biberon"
 * - Alimentacion Solidos: "[Nombre] comio [X] gr de solidos"
 * - Siesta: "[Nombre] durmio una siesta de [X] minutos"
 * - Sueno Nocturno: "[Nombre] durmio de [hora] a [hora]"
 * - Despertar: "[Nombre] desperto a las [hora]"
 * - Medicamento: "[Nombre] tomo [medicamento] ([dosis])"
 */

import {
  generateNarrative,
  generateTimeMetadata,
  NarrativeEvent,
} from "@/lib/narrative/generate-narrative"

// Mock del modulo datetime para tener control sobre el formato de horas
jest.mock("@/lib/datetime", () => ({
  formatForDisplay: (isoString, _timezone, format) => {
    // Parsear la fecha del ISO string
    const date = new Date(isoString)
    const hours = date.getHours()
    const minutes = date.getMinutes()

    // Simular formato "h:mm a" para narrativa
    if (format === "h:mm a") {
      const period = hours >= 12 ? "PM" : "AM"
      const displayHours = hours % 12 || 12
      const displayMinutes = String(minutes).padStart(2, "0")
      return `${displayHours}:${displayMinutes} ${period}`
    }

    // Fallback para otros formatos
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  },
  DEFAULT_TIMEZONE: "America/Monterrey",
  parseTimestamp: (isoString) => new Date(isoString),
}))

describe("generateNarrative", () => {
  const childName = "Matias"
  const timezone = "America/Monterrey"

  describe("Alimentacion - Pecho (breast)", () => {
    it("genera narrativa con duracion", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        feedingType: "breast",
        feedingDuration: 15,
        startTime: "2026-01-20T08:30:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo pecho por 15 minutos")
    })

    it("genera narrativa sin duracion", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        feedingType: "breast",
        startTime: "2026-01-20T08:30:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo pecho")
    })
  })

  describe("Alimentacion - Biberon (bottle)", () => {
    it("genera narrativa con cantidad en ml", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        feedingType: "bottle",
        feedingAmount: 120,
        startTime: "2026-01-20T10:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo 120 ml de biberon")
    })

    it("genera narrativa con duracion cuando no hay cantidad", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        feedingType: "bottle",
        feedingDuration: 20,
        startTime: "2026-01-20T10:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo biberon por 20 minutos")
    })

    it("genera narrativa sin cantidad ni duracion", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        feedingType: "bottle",
        startTime: "2026-01-20T10:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo biberon")
    })
  })

  describe("Alimentacion - Solidos (solids)", () => {
    it("genera narrativa con cantidad en gramos", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        feedingType: "solids",
        feedingAmount: 50,
        startTime: "2026-01-20T12:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias comio 50 gr de solidos")
    })

    it("genera narrativa sin cantidad", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        feedingType: "solids",
        startTime: "2026-01-20T12:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias comio solidos")
    })
  })

  describe("Alimentacion - Fallback", () => {
    it("genera narrativa generica cuando no hay feedingType", () => {
      const event: NarrativeEvent = {
        eventType: "feeding",
        startTime: "2026-01-20T08:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias se alimento")
    })

    it("maneja night_feeding igual que feeding", () => {
      const event: NarrativeEvent = {
        eventType: "night_feeding",
        feedingType: "bottle",
        feedingAmount: 60,
        startTime: "2026-01-20T02:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo 60 ml de biberon")
    })
  })

  describe("Sueno Nocturno (sleep)", () => {
    it("genera narrativa con hora inicio y fin", () => {
      const event: NarrativeEvent = {
        eventType: "sleep",
        startTime: "2026-01-19T20:30:00.000-06:00",
        endTime: "2026-01-20T07:15:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias durmio de 8:30 PM a 7:15 AM")
    })

    it("genera narrativa con solo duracion", () => {
      const event: NarrativeEvent = {
        eventType: "sleep",
        startTime: "2026-01-19T20:30:00.000-06:00",
        duration: 645, // 10 horas 45 min
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias durmio 10 horas y 45 minutos")
    })

    it("genera narrativa para sueno en progreso (solo startTime)", () => {
      const event: NarrativeEvent = {
        eventType: "sleep",
        startTime: "2026-01-20T20:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias se durmio a las 8:00 PM")
    })

    it("genera narrativa fallback sin datos", () => {
      const event: NarrativeEvent = {
        eventType: "sleep",
        startTime: "",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias durmio")
    })
  })

  describe("Siesta (nap)", () => {
    it("genera narrativa con duracion calculada", () => {
      const event: NarrativeEvent = {
        eventType: "nap",
        startTime: "2026-01-20T14:00:00.000-06:00",
        endTime: "2026-01-20T15:30:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias durmio una siesta de 1 hora y 30 minutos")
    })

    it("genera narrativa con duracion explicita", () => {
      const event: NarrativeEvent = {
        eventType: "nap",
        startTime: "2026-01-20T14:00:00.000-06:00",
        duration: 45,
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias durmio una siesta de 45 minutos")
    })

    it("genera narrativa para siesta en progreso", () => {
      const event: NarrativeEvent = {
        eventType: "nap",
        startTime: "2026-01-20T14:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias inicio siesta a las 2:00 PM")
    })

    it("genera narrativa fallback sin datos", () => {
      const event: NarrativeEvent = {
        eventType: "nap",
        startTime: "",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo una siesta")
    })
  })

  describe("Despertar Matutino (wake)", () => {
    it("genera narrativa con hora", () => {
      const event: NarrativeEvent = {
        eventType: "wake",
        startTime: "2026-01-20T07:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias desperto a las 7:00 AM")
    })

    it("genera narrativa sin hora", () => {
      const event: NarrativeEvent = {
        eventType: "wake",
        startTime: "",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias desperto")
    })
  })

  describe("Despertar Nocturno (night_waking)", () => {
    it("genera narrativa con hora y duracion despierto", () => {
      const event: NarrativeEvent = {
        eventType: "night_waking",
        startTime: "2026-01-20T03:00:00.000-06:00",
        awakeDelay: 20,
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias desperto a las 3:00 AM y estuvo despierto 20 minutos")
    })

    it("genera narrativa solo con hora", () => {
      const event: NarrativeEvent = {
        eventType: "night_waking",
        startTime: "2026-01-20T02:30:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias desperto a las 2:30 AM")
    })

    it("genera narrativa solo con duracion", () => {
      const event: NarrativeEvent = {
        eventType: "night_waking",
        startTime: "",
        awakeDelay: 15,
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias desperto durante la noche por 15 minutos")
    })

    it("genera narrativa fallback sin datos", () => {
      const event: NarrativeEvent = {
        eventType: "night_waking",
        startTime: "",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias desperto durante la noche")
    })
  })

  describe("Medicamento (medication)", () => {
    it("genera narrativa con nombre y dosis", () => {
      const event: NarrativeEvent = {
        eventType: "medication",
        medicationName: "Paracetamol",
        medicationDose: "5ml",
        startTime: "2026-01-20T09:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo Paracetamol (5ml)")
    })

    it("genera narrativa solo con nombre", () => {
      const event: NarrativeEvent = {
        eventType: "medication",
        medicationName: "Vitaminas",
        startTime: "2026-01-20T09:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo Vitaminas")
    })

    it("genera narrativa fallback sin datos", () => {
      const event: NarrativeEvent = {
        eventType: "medication",
        startTime: "2026-01-20T09:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias tomo medicamento")
    })
  })

  describe("Actividades Extra (extra_activities)", () => {
    it("genera narrativa con descripcion y duracion", () => {
      const event: NarrativeEvent = {
        eventType: "extra_activities",
        activityDescription: "juego en el parque",
        activityDuration: 30,
        startTime: "2026-01-20T16:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias hizo juego en el parque por 30 minutos")
    })

    it("genera narrativa solo con descripcion", () => {
      const event: NarrativeEvent = {
        eventType: "extra_activities",
        activityDescription: "bano",
        startTime: "2026-01-20T18:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias hizo bano")
    })

    it("genera narrativa solo con duracion", () => {
      const event: NarrativeEvent = {
        eventType: "extra_activities",
        activityDuration: 45,
        startTime: "2026-01-20T17:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias realizo una actividad de 45 minutos")
    })

    it("genera narrativa fallback sin datos", () => {
      const event: NarrativeEvent = {
        eventType: "extra_activities",
        startTime: "2026-01-20T16:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Matias realizo una actividad")
    })
  })

  describe("Notas (note)", () => {
    it("genera narrativa con noteText", () => {
      const event: NarrativeEvent = {
        eventType: "note",
        noteText: "Durmio mejor que ayer",
        startTime: "2026-01-20T08:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Nota: Durmio mejor que ayer")
    })

    it("genera narrativa con notes (campo alternativo)", () => {
      const event: NarrativeEvent = {
        eventType: "note",
        notes: "Noche tranquila",
        startTime: "2026-01-20T08:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Nota: Noche tranquila")
    })

    it("trunca notas largas a 100 caracteres", () => {
      const longNote = "A".repeat(150)
      const event: NarrativeEvent = {
        eventType: "note",
        noteText: longNote,
        startTime: "2026-01-20T08:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe(`Nota: ${"A".repeat(97)}...`)
      expect(result.length).toBeLessThanOrEqual(106) // "Nota: " + 100 chars max
    })

    it("genera narrativa fallback sin texto", () => {
      const event: NarrativeEvent = {
        eventType: "note",
        startTime: "2026-01-20T08:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Nota sobre Matias")
    })
  })

  describe("Tipos desconocidos", () => {
    it("genera narrativa fallback para tipo desconocido", () => {
      const event: NarrativeEvent = {
        eventType: "unknown" as never,
        startTime: "2026-01-20T08:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toBe("Evento registrado para Matias")
    })
  })

  describe("Formato de duracion", () => {
    it("formatea minutos correctamente", () => {
      const event: NarrativeEvent = {
        eventType: "nap",
        duration: 45,
        startTime: "2026-01-20T14:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toContain("45 minutos")
    })

    it("formatea horas exactas correctamente", () => {
      const event: NarrativeEvent = {
        eventType: "nap",
        duration: 60,
        startTime: "2026-01-20T14:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toContain("1 hora")
      expect(result).not.toContain("minutos")
    })

    it("formatea horas con minutos correctamente", () => {
      const event: NarrativeEvent = {
        eventType: "nap",
        duration: 95, // 1 hora 35 min
        startTime: "2026-01-20T14:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toContain("1 hora y 35 minutos")
    })

    it("formatea multiples horas correctamente", () => {
      const event: NarrativeEvent = {
        eventType: "sleep",
        duration: 180, // 3 horas
        startTime: "2026-01-19T20:00:00.000-06:00",
      }

      const result = generateNarrative(childName, event, timezone)

      expect(result).toContain("3 horas")
      expect(result).not.toContain("minutos")
    })
  })
})

describe("generateTimeMetadata", () => {
  const timezone = "America/Monterrey"

  it("retorna string vacio si no hay startTime", () => {
    const event: NarrativeEvent = {
      eventType: "feeding",
      startTime: "",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("")
  })

  it("retorna rango para eventos con duracion", () => {
    const event: NarrativeEvent = {
      eventType: "sleep",
      startTime: "2026-01-19T20:30:00.000-06:00",
      endTime: "2026-01-20T07:00:00.000-06:00",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("8:30 PM - 7:00 AM")
  })

  it("retorna rango para nap con endTime", () => {
    const event: NarrativeEvent = {
      eventType: "nap",
      startTime: "2026-01-20T14:00:00.000-06:00",
      endTime: "2026-01-20T15:30:00.000-06:00",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("2:00 PM - 3:30 PM")
  })

  it("retorna rango para feeding con endTime", () => {
    const event: NarrativeEvent = {
      eventType: "feeding",
      startTime: "2026-01-20T08:00:00.000-06:00",
      endTime: "2026-01-20T08:20:00.000-06:00",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("8:00 AM - 8:20 AM")
  })

  it("retorna solo hora de inicio para wake", () => {
    const event: NarrativeEvent = {
      eventType: "wake",
      startTime: "2026-01-20T07:00:00.000-06:00",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("7:00 AM")
  })

  it("retorna solo hora de inicio para medication", () => {
    const event: NarrativeEvent = {
      eventType: "medication",
      startTime: "2026-01-20T09:30:00.000-06:00",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("9:30 AM")
  })

  it("retorna solo hora de inicio para night_waking", () => {
    const event: NarrativeEvent = {
      eventType: "night_waking",
      startTime: "2026-01-20T02:30:00.000-06:00",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("2:30 AM")
  })

  it("retorna solo hora cuando evento con duracion no tiene endTime", () => {
    const event: NarrativeEvent = {
      eventType: "sleep",
      startTime: "2026-01-20T20:00:00.000-06:00",
    }

    const result = generateTimeMetadata(event, timezone)

    expect(result).toBe("8:00 PM")
  })
})
