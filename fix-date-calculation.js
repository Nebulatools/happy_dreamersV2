// Script para corregir el cálculo de fechas en los eventos
// El problema es que estamos sumando minutos directamente sin manejar el overflow

// Función correcta para sumar minutos a una fecha
function addMinutesToDateString(dateTimeString, minutesToAdd) {
  const date = new Date(dateTimeString)
  date.setMinutes(date.getMinutes() + minutesToAdd)
  return date.toISOString()
}

// Ejemplo del problema:
// INCORRECTO: "2025-04-19T13:30:00.000Z" + 68 minutos = "2025-04-19T13:98:00.000Z" ❌
// CORRECTO: "2025-04-19T13:30:00.000Z" + 68 minutos = "2025-04-19T14:38:00.000Z" ✅

console.log('🔍 DEMOSTRANDO EL PROBLEMA:')
const startTime = "2025-04-19T13:30:00.000Z"
const duration = 68

// Método incorrecto (el que estaba usando)
const badMethod = `2025-04-19T13:${30 + duration}:00.000Z` // = "2025-04-19T13:98:00.000Z"
console.log(`❌ Método incorrecto: ${badMethod}`)

// Método correcto
const goodMethod = addMinutesToDateString(startTime, duration)
console.log(`✅ Método correcto:   ${goodMethod}`)

console.log('\n📝 El problema está en el script regenerate-complete-test-data.js')
console.log('   Líneas que necesitan corrección:')
console.log('   - Línea ~179: endTime calculation en feeding')  
console.log('   - Línea ~212: endTime calculation en nap')
console.log('   - Línea ~253: endTime calculation en night_waking')
console.log('   - Línea ~301: endTime calculation en extra_activities')
console.log('   - Línea ~338: endTime calculation en night_feeding')

console.log('\n💡 SOLUCIÓN:')
console.log('   Usar Date.setMinutes() en lugar de suma directa de números')