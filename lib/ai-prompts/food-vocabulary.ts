// Vocabulario de alimentacion compartido por los 3 prompts de planes.
// (M2 del Plan Maestro reconciliado: eliminar las 3 copias literales en plans/route.ts)
//
// PARA ACTUALIZAR LAS RESTRICCIONES ALIMENTARIAS: edita SOLO este archivo.
// Antes estaba duplicado en Plan 0, Plan N y Refinamiento; si se actualizaba uno
// solo, las versiones divergian silenciosamente.

export const FOOD_VOCABULARY = `VOCABULARIO DE ALIMENTACION:
- Usa terminos variados segun el momento del dia: "Desayuno", "Almuerzo/Comida", "Merienda/Colacion/Snack", "Cena".
- Para referirte a la ingesta en general, alterna entre "alimento", "ingesta", "comida", "alimentacion". Evita repetir la palabra "comida" mas de 2 veces en el mismo bloque de recomendaciones.
- NO des recomendaciones nutricionales especificas ni nombres de alimentos concretos. NO somos nutriologos. En su lugar, sugiere COMBINACIONES GENERALES de grupos alimenticios adaptadas a la edad (ej: "Proteina + cereal + fruta", "Proteina + verdura + grasa saludable", "Cereal + fruta + lacteo").
- NO usar: "Avena con platano", "Pure de pollo con arroz", "Papilla de verduras" (demasiado especifico).
- NO usar: "Comida balanceada", "Comida nutritiva", "Desayuno nutritivo" (demasiado generico).
- SI usar: "Proteina + cereal + fruta", "Proteina + verdura + grasa", "Lacteo + cereal + fruta" (combinacion de grupos).`
