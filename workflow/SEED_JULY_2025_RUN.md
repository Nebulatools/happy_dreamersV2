Resumen de seeding – Julio 2025

- Fecha de ejecución: ahora (post Plan 0)
- Rango: 2025-07-01 00:00 → 2025-08-01 00:00 (local → ISO en DB)
- childId: 68d1af5315d0e9b1cc189544
- userEmail: ventas@jacoagency.io (owner esperado)
- Insertados: 177 eventos
- Total del niño tras inserción: 350 eventos

Tipos de eventos generados

- sleep (con `sleepDelay`) diario; wake implícito por `endTime`.
- night_waking (~30% prob.).
- night_feeding (~15% prob.).
- nap (60–120min) alrededor de 13:00, diario.
- feeding (solids): desayuno, comida, cena con jitter y cantidades/duración simuladas.
- extra_activities en fines de semana.
- medication el 15 de julio.

Script utilizado

- `scripts/seed-july-2025.js`

Notas

- Mantiene misma estructura y utilidades del seed de junio para consistencia.
- Asegura `parentId` del niño en cada evento para filtros del API.

