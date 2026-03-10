// Tests para computePatientStatus y sortByPatientPriority
import {
  computePatientStatus,
  sortByPatientPriority,
  type PatientStatusInput,
  type PatientSortInput,
} from "@/lib/patient-status"

describe("computePatientStatus", () => {
  const now = new Date()

  // Helper: crear fecha hace N dias
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  it("retorna 'archived' si archived es true (prioridad maxima)", () => {
    const input: PatientStatusInput = {
      archived: true,
      hasActivePlan: true, // Incluso con plan activo
      lastEventDate: now, // Incluso con actividad reciente
      childCreatedAt: now,
    }
    expect(computePatientStatus(input)).toBe("archived")
  })

  it("retorna 'active' si tiene plan activo", () => {
    const input: PatientStatusInput = {
      archived: false,
      hasActivePlan: true,
      lastEventDate: null,
      childCreatedAt: daysAgo(60),
    }
    expect(computePatientStatus(input)).toBe("active")
  })

  it("retorna 'active' si ultimo evento fue hace menos de 30 dias", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: daysAgo(15),
      childCreatedAt: daysAgo(60),
    }
    expect(computePatientStatus(input)).toBe("active")
  })

  it("retorna 'active' si fue creado hace menos de 14 dias (gracia)", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: null,
      childCreatedAt: daysAgo(10),
    }
    expect(computePatientStatus(input)).toBe("active")
  })

  it("retorna 'inactive' si no tiene plan, sin eventos y creado hace mas de 14 dias", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: null,
      childCreatedAt: daysAgo(30),
    }
    expect(computePatientStatus(input)).toBe("inactive")
  })

  it("retorna 'inactive' si ultimo evento fue hace mas de 30 dias", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: daysAgo(45),
      childCreatedAt: daysAgo(90),
    }
    expect(computePatientStatus(input)).toBe("inactive")
  })

  it("retorna 'active' en el limite exacto de 30 dias (dia 29)", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: daysAgo(29),
      childCreatedAt: daysAgo(60),
    }
    expect(computePatientStatus(input)).toBe("active")
  })

  it("retorna 'inactive' justo despues del limite de 30 dias (dia 31)", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: daysAgo(31),
      childCreatedAt: daysAgo(60),
    }
    expect(computePatientStatus(input)).toBe("inactive")
  })

  it("retorna 'active' en el limite de gracia de 14 dias (dia 13)", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: null,
      childCreatedAt: daysAgo(13),
    }
    expect(computePatientStatus(input)).toBe("active")
  })

  it("retorna 'inactive' justo despues de la gracia de 14 dias (dia 15)", () => {
    const input: PatientStatusInput = {
      hasActivePlan: false,
      lastEventDate: null,
      childCreatedAt: daysAgo(15),
    }
    expect(computePatientStatus(input)).toBe("inactive")
  })
})

describe("sortByPatientPriority", () => {
  it("ordena alertas criticas primero, luego warning, luego sin alerta", () => {
    const patients: PatientSortInput[] = [
      { childId: "a", triageSeverity: undefined, hasActivePlan: true, lastEventDate: new Date(), childName: "Ana" },
      { childId: "b", triageSeverity: "critical", hasActivePlan: false, lastEventDate: null, childName: "Bruno" },
      { childId: "c", triageSeverity: "warning", hasActivePlan: true, lastEventDate: new Date(), childName: "Carlos" },
    ]
    const sorted = sortByPatientPriority(patients)
    expect(sorted.map(p => p.childId)).toEqual(["b", "c", "a"])
  })

  it("dentro de misma severidad, ordena sin plan antes de con plan", () => {
    const patients: PatientSortInput[] = [
      { childId: "a", triageSeverity: undefined, hasActivePlan: true, lastEventDate: new Date(), childName: "Ana" },
      { childId: "b", triageSeverity: undefined, hasActivePlan: false, lastEventDate: new Date(), childName: "Bruno" },
    ]
    const sorted = sortByPatientPriority(patients)
    expect(sorted.map(p => p.childId)).toEqual(["b", "a"])
  })

  it("dentro de misma severidad y plan, ordena por actividad mas reciente primero", () => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const patients: PatientSortInput[] = [
      { childId: "a", triageSeverity: undefined, hasActivePlan: true, lastEventDate: yesterday, childName: "Ana" },
      { childId: "b", triageSeverity: undefined, hasActivePlan: true, lastEventDate: now, childName: "Bruno" },
    ]
    const sorted = sortByPatientPriority(patients)
    expect(sorted.map(p => p.childId)).toEqual(["b", "a"])
  })

  it("como fallback final, ordena alfabeticamente por nombre", () => {
    const patients: PatientSortInput[] = [
      { childId: "a", triageSeverity: undefined, hasActivePlan: true, lastEventDate: null, childName: "Zara" },
      { childId: "b", triageSeverity: undefined, hasActivePlan: true, lastEventDate: null, childName: "Ana" },
    ]
    const sorted = sortByPatientPriority(patients)
    expect(sorted.map(p => p.childId)).toEqual(["b", "a"])
  })
})
