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

  test("contiene instruccion de descripciones especificas al bebe", () => {
    expect(fileContent).toContain("Papilla de verduras")
    expect(fileContent).toContain("Cereal con fruta")
    expect(fileContent).toContain("Pure de pollo con arroz")
  })

  test("contiene instruccion de NO usar descripciones genericas", () => {
    // Debe mencionar explicitamente que NO usar genericos
    // El formato en el archivo es: (NO "Comida balanceada", "Comida nutritiva", "Desayuno nutritivo")
    expect(fileContent).toContain('NO "Comida balanceada"')
    expect(fileContent).toContain('"Comida nutritiva"')
    expect(fileContent).toContain('"Desayuno nutritivo"')
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
  //    ("Desayuno nutritivo", "Almuerzo balanceado")
  // -------------------------------------------------------

  test("NO contiene 'Desayuno nutritivo' como descripcion de fallback (campo description)", () => {
    // "Desayuno nutritivo" aparece en la instruccion del prompt como ejemplo de lo que NO hacer,
    // pero NO debe aparecer como valor de un campo description en los fallbacks.
    // Verificamos que no haya: description: "Desayuno nutritivo"
    expect(fileContent).not.toMatch(/description:\s*["']Desayuno nutritivo["']/)
  })

  test("NO contiene 'Almuerzo balanceado' como descripcion de fallback", () => {
    expect(fileContent).not.toContain("Almuerzo balanceado")
  })

  test("NO contiene 'Merienda saludable' como descripcion de fallback generica", () => {
    // Si alguna vez existio como fallback, no debe estar
    expect(fileContent).not.toContain('"Merienda saludable"')
  })

  // -------------------------------------------------------
  // D) Verificar que los ejemplos JSON en prompts tienen
  //    descripciones especificas, no genericas
  // -------------------------------------------------------

  test("los ejemplos JSON de meals usan descripciones especificas", () => {
    // Buscamos que al menos algunos ejemplos tengan descripciones concretas
    // como "Avena con platano", "Pure de pollo", "Fruta picada", "Crema de calabaza"
    const specificDescriptions = [
      "Avena con platano",
      "Pure de pollo",
      "Fruta picada",
      "Crema de calabaza",
    ]
    const foundCount = specificDescriptions.filter(desc => fileContent.includes(desc)).length
    expect(foundCount).toBeGreaterThanOrEqual(2)
  })

  // -------------------------------------------------------
  // E) Verificar los fallbacks actualizados
  // -------------------------------------------------------

  test("los fallbacks usan descripciones no-genericas", () => {
    // Verificar que los fallbacks (plan basico) usan frases aceptables
    // como "Cereal o fruta de temporada", "Proteina con verduras", etc.
    expect(fileContent).toContain("Cereal o fruta de temporada")
    expect(fileContent).toContain("Proteina con verduras")
    expect(fileContent).toContain("Colacion saludable")
  })
})
