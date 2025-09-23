Resumen de seeding – Agosto 2025

- Contexto: continuar después de Plan 1 (01/ago/2025)
- Rango: 2025-08-01 00:00 → 2025-09-01 00:00 (local → ISO en DB)
- childId: 68d1af5315d0e9b1cc189544
- userEmail: ventas@jacoagency.io (owner esperado)
- Script: `scripts/seed-august-2025.js`

Tipos de eventos generados

- sleep (con `sleepDelay`) nocturno diario; wake implícito por `endTime`.
- night_waking (~30% prob.).
- night_feeding (~15% prob.).
- nap (60–120 min) alrededor de 13:00, diario.
- feeding (solids): desayuno, comida, cena con jitter y cantidades/duración simuladas.
- extra_activities en fines de semana.
- medication el 15 de agosto.

Notas de ejecución

- Limpia previamente cualquier evento del niño en el rango de agosto 2025 para evitar duplicados.
- Usa `parentId` del niño para mantener filtros del API consistentes.
- Variables opcionales: `SEED_CHILD_ID`, `SEED_USER_EMAIL` (env).

Comando sugerido

```bash
node scripts/seed-august-2025.js
```

