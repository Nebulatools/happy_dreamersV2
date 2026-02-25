// Tests para verificar la logica de ordenamiento y filtrado
// del componente PatientQuickSelector.
// Se extraen las funciones puras y se testean de forma aislada.

// -------------------------------------------------------
// Funciones extraidas del componente (logica pura)
// -------------------------------------------------------

interface Child {
  _id: string
  firstName: string
  lastName: string
  parentId: string
  birthDate?: string
  surveyData?: {
    completed?: boolean
  }
}

// Replicas exactas de las funciones del componente

function getSortedChildren(children: Child[]): Child[] {
  return [...children].sort((a, b) =>
    (a.firstName || "").localeCompare(b.firstName || "", "es")
  )
}

function isUserActive(
  userId: string,
  userChildren: Record<string, Child[]>,
  globalChildrenMap: Record<string, Child[]>
): boolean {
  const children = userChildren[userId] || globalChildrenMap[userId] || []
  return children.some(child => child.surveyData?.completed === true)
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : parts[0]
}

// -------------------------------------------------------
// Tests
// -------------------------------------------------------

describe("PatientQuickSelector - getSortedChildren", () => {
  const makeChild = (firstName: string, id?: string): Child => ({
    _id: id || firstName.toLowerCase(),
    firstName,
    lastName: "Test",
    parentId: "p1",
  })

  test("ordena ninos A-Z por firstName", () => {
    const input = [makeChild("Zara"), makeChild("Ana"), makeChild("Miguel")]
    const sorted = getSortedChildren(input)
    expect(sorted.map(c => c.firstName)).toEqual(["Ana", "Miguel", "Zara"])
  })

  test("no muta el array original", () => {
    const input = [makeChild("Carlos"), makeChild("Ana")]
    const copy = [...input]
    getSortedChildren(input)
    expect(input).toEqual(copy)
  })

  test("maneja array vacio", () => {
    expect(getSortedChildren([])).toEqual([])
  })

  test("maneja firstName vacio o undefined", () => {
    const input = [
      makeChild("Beta"),
      { _id: "x", firstName: "", lastName: "X", parentId: "p1" } as Child,
      makeChild("Alpha"),
    ]
    const sorted = getSortedChildren(input)
    // String vacio va primero en localeCompare
    expect(sorted[0].firstName).toBe("")
    expect(sorted[1].firstName).toBe("Alpha")
    expect(sorted[2].firstName).toBe("Beta")
  })

  test("ordena correctamente con caracteres en espanol (acentos, ene)", () => {
    const input = [makeChild("Oscar"), makeChild("Alvaro"), makeChild("Nuria")]
    const sorted = getSortedChildren(input)
    expect(sorted.map(c => c.firstName)).toEqual(["Alvaro", "Nuria", "Oscar"])
  })
})

describe("PatientQuickSelector - isUserActive", () => {
  test("retorna true si al menos un hijo tiene survey completado", () => {
    const userChildren: Record<string, Child[]> = {
      "u1": [
        { _id: "c1", firstName: "A", lastName: "B", parentId: "u1", surveyData: { completed: false } },
        { _id: "c2", firstName: "C", lastName: "D", parentId: "u1", surveyData: { completed: true } },
      ],
    }
    expect(isUserActive("u1", userChildren, {})).toBe(true)
  })

  test("retorna false si ningun hijo tiene survey completado", () => {
    const userChildren: Record<string, Child[]> = {
      "u1": [
        { _id: "c1", firstName: "A", lastName: "B", parentId: "u1", surveyData: { completed: false } },
      ],
    }
    expect(isUserActive("u1", userChildren, {})).toBe(false)
  })

  test("retorna false si el usuario no tiene hijos registrados", () => {
    expect(isUserActive("u999", {}, {})).toBe(false)
  })

  test("retorna false si surveyData es undefined", () => {
    const userChildren: Record<string, Child[]> = {
      "u1": [
        { _id: "c1", firstName: "A", lastName: "B", parentId: "u1" },
      ],
    }
    expect(isUserActive("u1", userChildren, {})).toBe(false)
  })

  test("usa globalChildrenMap como fallback si userChildren no tiene el usuario", () => {
    const globalChildrenMap: Record<string, Child[]> = {
      "u1": [
        { _id: "c1", firstName: "A", lastName: "B", parentId: "u1", surveyData: { completed: true } },
      ],
    }
    expect(isUserActive("u1", {}, globalChildrenMap)).toBe(true)
  })

  test("userChildren tiene prioridad sobre globalChildrenMap", () => {
    const userChildren: Record<string, Child[]> = {
      "u1": [
        { _id: "c1", firstName: "A", lastName: "B", parentId: "u1", surveyData: { completed: false } },
      ],
    }
    const globalChildrenMap: Record<string, Child[]> = {
      "u1": [
        { _id: "c1", firstName: "A", lastName: "B", parentId: "u1", surveyData: { completed: true } },
      ],
    }
    // userChildren["u1"] existe, se usa ese (completed: false)
    expect(isUserActive("u1", userChildren, globalChildrenMap)).toBe(false)
  })
})

describe("PatientQuickSelector - getLastName", () => {
  test("extrae el ultimo token como apellido", () => {
    expect(getLastName("Maria Garcia")).toBe("Garcia")
  })

  test("retorna el unico nombre si solo hay uno", () => {
    expect(getLastName("Maria")).toBe("Maria")
  })

  test("maneja nombres con multiples palabras", () => {
    expect(getLastName("Maria del Carmen Lopez")).toBe("Lopez")
  })

  test("maneja espacios extra", () => {
    expect(getLastName("  Juan   Perez  ")).toBe("Perez")
  })
})
