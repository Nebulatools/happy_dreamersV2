# Discoveries: Vista Narrativa, Taxonomia Visual y Split Screen

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementacion)

---

## Archivos Clave Identificados

| Archivo | Proposito | Notas |
|---------|-----------|-------|
| `components/calendar/EventGlobe.tsx:117-134` | Mapa de iconos actual | Reemplazar con nuevo registry |
| `lib/utils/sleep-sessions.ts` | Procesa sleep sessions | Agregar overlayEvents |
| `components/calendar/SleepSessionBlock.tsx` | Renderiza sesiones | Agregar render de overlays |
| `lib/datetime.ts` | Manejo de fechas | Usar buildLocalDate() |

---

## Sesiones

### Session 0 - 2026-01-20

**Setup inicial**
- Implementation plan generado con 28 tareas en 8 fases
- Archivos de ejecucion creados
- Credenciales de testing documentadas
- Listo para `./ralph-loop.sh` (usa docs/specs/current/ automaticamente)

**Patterns identificados:**
- Iconos actuales usan switch-case en EventGlobe.tsx
- Sleep sessions NO detectan feeding/medication durante sueno (bug conocido)
- Playwright MCP para testing, NO npx playwright test
