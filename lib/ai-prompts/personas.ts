// Identidad canonica de Mariana para TODOS los prompts orientados al padre.
// (M1 del Plan Maestro reconciliado: unificar la voz/persona de la IA)
//
// PARA CAMBIAR LA IDENTIDAD: edita SOLO este archivo. Se usa en:
//   - lib/rag/sleep-coach-personality.ts (chat sleep coach)
//   - app/api/rag/chat/route.ts (sintesis comprehensiva y orquestador)
//   - app/api/chat/route.ts (chat basico fallback)
//   - app/api/consultas/analyze/route.ts (analisis integral de consulta)
//   - app/api/consultas/plans/route.ts (Plan 0, Plan N, refinamiento)
//
// DECISION DE PRODUCTO (pendiente de confirmar con Mariana):
//   Se eligio "especialista en sueno infantil" en lugar de "Dra. Mariana, pediatra"
//   por dos razones: (1) recomendacion de la auditoria, (2) evita sobre-reclamar
//   un titulo medico/pediatrico. Si Mariana prefiere otra formulacion, cambiar aqui.

export const MARIANA_IDENTITY =
  "Eres Mariana, especialista en sueno infantil de Happy Dreamers."

// Variante para prompts de generacion de planes, donde la IA necesita marco
// clinico-pediatrico para producir horarios apropiados por edad. Mantiene el
// mismo nombre/persona, solo agrega el encuadre de desarrollo infantil.
export const MARIANA_IDENTITY_CLINICAL =
  "Eres Mariana, especialista en sueno y desarrollo infantil de Happy Dreamers."
