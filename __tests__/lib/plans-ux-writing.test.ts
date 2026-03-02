// Tests para verificar que los prompts de planes contienen
// el vocabulario de alimentacion actualizado y NO los strings viejos.

import * as fs from "fs"
import * as path from "path"

const ROUTE_PATH = path.join(process.cwd(), "app", "api", "consultas", "plans", "route.ts")

let fileContent: string

beforeAll(() => {
  fileContent = fs.readFileSync(ROUTE_PATH, "utf-8")
})

describe("Plans UX Writing - Vocabulario de alimentacion", () => {
  // -------------------------------------------------------
  // A) Verificar que los 3 prompts principales contienen la
  //    instruccion de vocabulario variado
  // -------------------------------------------------------

  test("el prompt initial contiene instruccion de vocabulario variado", () => {
    expect(fileContent).toContain("VOCABULARIO DE ALIMENTACION")
  })

  test("contiene la instruccion de usar terminos variados (Desayuno, Almuerzo, Merienda, Cena)", () => {
    expect(fileContent).toContain("Desayuno")
    expect(fileContent).toContain("Almuerzo")
    expect(fileContent).toContain("Merienda")
    expect(fileContent).toContain("Colacion")
    expect(fileContent).toContain("Cena")
  })

  test("contiene instruccion de alternar entre alimento, ingesta, comida, alimentacion", () => {
    expect(fileContent).toContain("alimento")
    expect(fileContent).toContain("ingesta")
    expect(fileContent).toContain("alimentacion")
  })

  test("contiene instruccion de usar combinaciones de grupos alimenticios", () => {
    expect(fileContent).toContain("Proteina + cereal + fruta")
    expect(fileContent).toContain("Proteina + verdura + grasa saludable")
    expect(fileContent).toContain("Cereal + fruta + lacteo")
  })

  test("contiene instruccion de NO ser nutriologos", () => {
    expect(fileContent).toContain("NO somos nutriologos")
  })

  test("contiene instruccion de NO usar descripciones genericas", () => {
    // Debe mencionar explicitamente que NO usar genericos
    expect(fileContent).toContain('"Comida balanceada"')
    expect(fileContent).toContain('"Comida nutritiva"')
    expect(fileContent).toContain('"Desayuno nutritivo"')
  })

  test("contiene instruccion de NO usar alimentos especificos", () => {
    // Debe mencionar explicitamente que NO usar nombres concretos
    expect(fileContent).toContain('"Avena con platano"')
    expect(fileContent).toContain('"Pure de pollo con arroz"')
    expect(fileContent).toContain('"Papilla de verduras"')
  })

  // -------------------------------------------------------
  // B) Verificar que la seccion de VOCABULARIO aparece en
  //    los 3 prompts: initial, event_based, transcript_refinement
  // -------------------------------------------------------

  test("la seccion VOCABULARIO DE ALIMENTACION aparece al menos 3 veces (una por prompt)", () => {
    const matches = fileContent.match(/VOCABULARIO DE ALIMENTACION/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(3)
  })

  // -------------------------------------------------------
  // C) Verificar que los fallbacks ya NO contienen strings viejos
  // -------------------------------------------------------

  test("NO contiene 'Desayuno nutritivo' como descripcion de fallback (campo description)", () => {
    expect(fileContent).not.toMatch(/description:\s*["']Desayuno nutritivo["']/)
  })

  test("NO contiene 'Almuerzo balanceado' como descripcion de fallback", () => {
    expect(fileContent).not.toContain("Almuerzo balanceado")
  })

  test("NO contiene 'Merienda saludable' como descripcion de fallback generica", () => {
    expect(fileContent).not.toContain('"Merienda saludable"')
  })

  test("NO contiene descripciones de alimentos especificos en ejemplos JSON", () => {
    // Verificar que los ejemplos JSON ya no tienen alimentos concretos
    expect(fileContent).not.toMatch(/description.*Avena con platano y canela/)
    expect(fileContent).not.toMatch(/description.*Pure de pollo con verduras/)
    expect(fileContent).not.toMatch(/description.*Fruta picada con yogur/)
    expect(fileContent).not.toMatch(/description.*Crema de calabaza con arroz/)
  })

  // -------------------------------------------------------
  // D) Verificar que los ejemplos JSON en prompts tienen
  //    descripciones con combinaciones de grupos alimenticios
  // -------------------------------------------------------

  test("los ejemplos JSON de meals usan combinaciones de grupos alimenticios", () => {
    const groupCombinations = [
      "Cereal + fruta + lacteo",
      "Proteina + verdura + cereal",
      "Proteina + verdura + grasa saludable",
    ]
    const foundCount = groupCombinations.filter(desc => fileContent.includes(desc)).length
    expect(foundCount).toBeGreaterThanOrEqual(2)
  })

  // -------------------------------------------------------
  // E) Verificar los fallbacks actualizados
  // -------------------------------------------------------

  test("los fallbacks usan combinaciones de grupos alimenticios", () => {
    // Verificar que los fallbacks (plan basico) usan combinaciones de grupos
    expect(fileContent).toContain("Cereal + fruta + lacteo")
    expect(fileContent).toContain("Proteina + verdura + cereal")
    expect(fileContent).toContain("Fruta + lacteo o cereal")
  })

  test("NO contiene fallbacks viejos con alimentos genericos", () => {
    expect(fileContent).not.toMatch(/description.*Cereal o fruta de temporada/)
    expect(fileContent).not.toMatch(/description.*Colacion saludable/)
    expect(fileContent).not.toMatch(/description.*Cena ligera antes de la rutina/)
  })
})
