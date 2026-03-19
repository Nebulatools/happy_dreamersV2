# Release Notes - 19 Marzo 2026
## Bugfixes criticos reportados por usuarios (British Columbia + Miami)

---

### Bug 1: Timezone incorrecto (CRITICO)
**Reporte**: Usuarios en British Columbia y Miami registraban eventos a las 10pm pero el sistema mostraba 11pm (1 hora de diferencia).

**Causa raiz**: El sistema solo soportaba timezones de Mexico. Usuarios fuera de Mexico quedaban con "America/Monterrey" por default. Habia 3 listas de timezones diferentes e inconsistentes entre si (frontend, API, configuracion).

**Solucion**:
- Se expandio la lista de timezones soportadas: Mexico, USA, Canada, Latinoamerica, Europa
- La deteccion automatica del navegador ahora acepta cualquier timezone IANA valida (no solo mexicanas)
- El API ya no rechaza timezones validas como "America/Vancouver" o "America/New_York"
- El dropdown de configuracion se genera dinamicamente desde una sola fuente de verdad

**Archivos**: `lib/datetime.ts`, `app/api/user/profile/route.ts`, `app/dashboard/configuracion/page.tsx`

---

### Bug 2: Boton "Registrar Evento" desaparece de noche
**Reporte**: Cuando el bebe esta durmiendo, el boton "Registrar Evento" (registro manual) desaparece completamente. Los padres no pueden registrar eventos retroactivos durante la noche.

**Causa raiz**: El boton estaba condicionado a `isAwake` (solo visible cuando el bebe esta despierto).

**Solucion**: El boton ahora esta siempre visible independientemente del estado del bebe. Permite registrar cualquier tipo de evento en cualquier momento.

**Archivos**: `components/events/EventRegistration.tsx`

---

### Bug 3: Despertar no permite ajustar la hora
**Reporte**: Al presionar "SE DESPERTO" o "DESPERTAR NOCTURNO", el evento se registra con la hora exacta del click. No hay opcion de ajustar la hora. Problema comun: el papa esta calmando al bebe y no puede sacar el celular en ese momento. Cuando finalmente registra, ya pasaron 10-20 minutos.

**Causa raiz**: El modal de despertar solo capturaba estado emocional y notas, sin campo de hora.

**Solucion**:
- Se agrego un campo de hora editable al modal de despertar (prellenado con hora actual)
- Se agrego un banner informativo que muestra cuanto tiempo lleva durmiendo el bebe (ej: "Durmiendo hace 2h 15m")
- Si el papa no modifica la hora, funciona exactamente igual que antes
- Si necesita ajustar, simplemente cambia la hora hacia atras

**Archivos**: `components/events/EventNotesModal.tsx`, `components/events/SleepButton.tsx`

---

### Resumen de impacto
| Bug | Severidad | Usuarios afectados | Estado |
|-----|-----------|-------------------|--------|
| Timezone | Critica | Todos fuera de Mexico | Resuelto |
| Boton nocturno | Alta | Todos los usuarios | Resuelto |
| Hora de despertar | Alta | Todos los usuarios | Resuelto |

### Verificacion sugerida
- [ ] Usuario con timezone "America/Vancouver" → eventos se registran con hora correcta
- [ ] Usuario con timezone "America/New_York" (Miami) → eventos con hora correcta
- [ ] Bebe durmiendo → boton "Registrar Evento" visible
- [ ] Click "SE DESPERTO" → modal muestra campo de hora ajustable + tiempo durmiendo
- [ ] Click "DESPERTAR NOCTURNO" → mismo comportamiento con hora ajustable
