# Changelog – Panel para Padres (UI y Métricas)

Este archivo registra los cambios enfocados en lo que ve un padre en el panel y en la vista de estadísticas, desde la incorporación de las nuevas gráficas hasta ahora. Incluye dónde ver cada cambio y cómo probarlo.

Última actualización: 2025-09-10

---

## Cómo Verlos (rápido)
- Ejecutar en desarrollo: `npm run dev`
- Ingresar con una cuenta de padre (ej. `test@test.com`).
- Rutas clave:
  - Panel principal: `/dashboard`
  - Estadísticas de sueño: `/dashboard/sleep-statistics`
  - Registro/edición de alimentación: en el Panel (`ALIMENTACIÓN`) y en edición de eventos.

---

## Cambios Principales (orden cronológico aproximado)

### 0) Alimentación: reglas por tipo (mejora)
- Qué: Se ajustó la captura/validación según tipo de alimentación.
  - Pecho: se registra en minutos (duración). No requiere cantidad.
  - Biberón: se registra cantidad en onzas (oz) en UI, se guarda en ml; duración requerida.
  - Sólidos: siempre en estado “Despierto”; cantidad en gramos y duración requeridas.
- Dónde verlo: botón `ALIMENTACIÓN` en `/dashboard` (modal), edición de eventos y formulario manual.
- Archivos:
  - `components/events/FeedingModal.tsx` (UI y normalización)
  - `components/events/FeedingButton.tsx` (mapeo de payload + night_feeding solo líquidos)
  - `components/events/EventEditRouter.tsx` (edición con reglas nuevas)
  - `components/events/manual/ManualEventForm.tsx` (formulario manual con reglas por tipo)
  - `app/api/children/events/route.ts` (validaciones backend por tipo)

### 1) Gráfica combinada en Panel (sustituye los 4 recuadros)
- Qué: Se reemplazó la grilla de 4 métricas por una gráfica compuesta (línea + barras + dispersión) con selector 7d/30d/90d.
- Muestra:
  - Línea: horas de sueño nocturno por día.
  - Barras: despertares nocturnos por día (color más oscuro para mejor contraste).
  - Puntos: hora de acostarse (morado más oscuro) y de despertar (verde más oscuro) — eje horario nocturno 21:00→06:00.
- Dónde verlo: `/dashboard`, al seleccionar un niño.
- Archivos:
  - `components/child-profile/SleepMetricsCombinedChart.tsx`
  - `app/dashboard/page.tsx` (usa el componente nuevo)

### 2) Alimentación: biberón en onzas (oz)
- Qué: Para biberón, la UI ahora muestra y captura cantidades en onzas (oz); el backend sigue guardando en ml (conversión automática oz↔ml).
- Dónde verlo: botón `ALIMENTACIÓN` en `/dashboard` (modal) y al editar un evento de alimentación.
- Archivos (principalmente):
  - `components/events/FeedingModal.tsx` (UI en oz)
  - `components/events/FeedingButton.tsx` (convierte oz→ml al enviar)
  - `components/events/ManualEventModal.tsx` y `components/events/manual/ManualEventForm.tsx`
  - `components/events/EventEditRouter.tsx` (convierte ml↔oz al editar)

### 3) Estadísticas: distribución del sueño
- Qué:
  - Se eliminó la “rueda” con el texto “total” (el total ya se muestra al inicio).
  - Se añadió KPI “Ventanas 2–4 h” con porcentaje (verde/amarillo/rojo) y etiqueta por período “Dentro/ Fuera 2–4h”.
  - Se añadió tooltip junto al KPI explicando por qué 2–4 h.
  - Se añadió un histograma compacto de ventanas (<1h, 1–2h, 2–3h, 3–4h, 4–5h, >5h).
- Dónde verlo: `/dashboard/sleep-statistics` → “Distribución del sueño”.
- Archivos:
  - `components/sleep-statistics/SleepDistributionChart.tsx`

### 4) Estadísticas: de “promedio” a “rango típico (p25–p75) + mediana”
- Qué: Las tarjetas clave muestran ahora rangos típicos p25–p75 y la mediana en lugar de solo promedio.
  - Hora de despertar, Hora de acostarse, Sueño nocturno.
- Dónde verlo: `/dashboard` (tarjeta de métricas) y en estadísticas.
- Archivos:
  - `components/child-profile/SleepMetricsGrid.tsx`
  - Nuevas utilidades: `lib/stats.ts`, `lib/sleep-stats.ts`

### 5) Mensajes positivos estilo gamificación (solo padres)
- Qué: Tarjeta con 1–2 mensajes motivadores basada en KPIs (ventanas 2–4 h, mediana de sueño nocturno, consistencia al acostarse, despertares) y progresos vs. período anterior.
- Dónde verlo: `/dashboard/sleep-statistics`, aparece bajo “Métricas mejoradas”. Oculto para `admin`.
- Archivos:
  - `components/sleep-statistics/PositiveFeedbackCard.tsx`
  - `app/dashboard/sleep-statistics/page.tsx` (inserta la tarjeta)

### 6) Para Hoy: instrucciones y cambios destacados (solo padres)
- Qué: Tarjeta que resume qué toca hoy (Despertar, Siestas, Acostarse) según el plan activo, con prioridad temporal ("Ahora", "En X min"). Marca cambios vs. el plan anterior con badge “Cambió” y muestra el antes→ahora si la diferencia ≥ 15 min.
- Dónde verlo:
  - `/dashboard` (debajo del saludo, antes de la gráfica combinada)
  - `/dashboard/sleep-statistics` (debajo de “Métricas mejoradas” y la tarjeta de mensajes positivos)
- Archivos:
  - `components/parent/TodayInstructionsCard.tsx`
  - `app/dashboard/page.tsx` (inserta la tarjeta)
  - `app/dashboard/sleep-statistics/page.tsx` (inserta la tarjeta)

### 7) Políticas de ajuste integradas (backend)
- Qué: Se definieron políticas para ajustes de horarios y destete nocturno y se integraron en la lógica del sistema (para sugerencias visibles al padre). Preparada la integración en el prompt del generador de planes para que la IA respete: ajustes de 30 min en general; 10–15 min en transición 15–18 m; destete nocturno moviendo toma y aumentando oz de forma paulatina.
- Archivos:
  - `lib/plan-policies.ts` (cálculo dinámico por edad y eventos)
  - Backend pendiente de despliegue final del prompt (ver PR) en `app/api/consultas/plans/route.ts`.

### 8) Actividades extra: ocultar “impacto en el sueño” para padres
- Qué: Los usuarios papá/mamá ya no pueden seleccionar el campo “Impacto esperado en el sueño” al registrar/editar Actividades Extra. Solo visible para administradores. Para padres, se guarda como “neutral” por defecto (en creación) o se mantiene el valor previo (en edición) sin permitir cambios.
- Dónde verlo: Botón `ACTIVIDAD` en `/dashboard` (modal) y edición de eventos de tipo actividad.
- Archivos:
  - `components/events/ExtraActivityModal.tsx` (oculta el selector para rol no admin y normaliza el valor)

### 9) Tiempo: hora fin opcional en eventos con duración
- Qué: En el registro manual, “Hora inicio” es obligatoria y “Hora fin” es opcional para eventos con duración (Sueño nocturno, Siesta, Despertar nocturno). Se añadió un toggle para activar la hora de fin. Los eventos sin duración mantienen su comportamiento (alimentación y actividades calculan fin a partir de duración ingresada en la UI).
- Dónde verlo: Modal “Registrar Evento” en `/dashboard`.
- Archivos:
  - `components/events/ManualEventModal.tsx` (toggle “Agregar hora de fin (opcional)”, validación y envío condicional)

### 10) Encuesta médica: trigger por empeoramiento y recordatorio semanal
- Qué: Se añade una tarjeta que sugiere responder una breve encuesta de sintomatología cuando las métricas empeoran (↓ ≥0.5h de sueño, ↑ ≥0.5 despertares, ↑ ≥10m en variación). Incluye “Responder ahora” (lleva a `/dashboard/survey`) y “Recordar más tarde” (no vuelve a mostrarse por 7 días).
- Dónde verlo: `/dashboard` y `/dashboard/sleep-statistics`.
- Archivos:
  - `components/alerts/MedicalSurveyPrompt.tsx` (lógica y UI)
  - `app/dashboard/page.tsx` y `app/dashboard/sleep-statistics/page.tsx` (integración)

### 11) Destete: minutos como dato y captura manual
- Qué: El control de “Pecho” usa minutos como dato principal (para destete progresivo) y permite captura manual. Para “Duración” en biberón/sólidos también se agregó input manual. En pecho el paso es dinámico: 1–10 (paso 1), luego de 5 en 5.
- Dónde verlo: Modal de alimentación en `/dashboard`.
- Archivos:
  - `components/events/FeedingModal.tsx` (entrada manual + paso dinámico)

---

## Instrucciones de Prueba
1) Panel principal (`/dashboard`):
   - Selecciona un niño.
   - Verifica el selector 7d/30d/90d en la gráfica combinada.
   - Registra “ALIMENTACIÓN (biberón)” en oz; confirma y revisa que el toast muestre oz y que se guarde en ml.
   - Registra “ALIMENTACIÓN (pecho)”: el control principal es “Duración (min)”; no se solicita cantidad.
   - Registra “ALIMENTACIÓN (sólidos)”: verifica que “Dormido” esté deshabilitado y que se pidan gramos y duración.

2) Estadísticas (`/dashboard/sleep-statistics`):
   - Revisa que aparezca “Métricas mejoradas” y, debajo, la tarjeta de mensajes positivos (como padre).
   - Verifica que aparezca la tarjeta “Para Hoy” con los items del plan y, si hubo cambios vs. el plan anterior, se vea el badge “Cambió” con el antes→ahora.
   - En “Distribución del sueño”, verifica:
     - KPI “Ventanas 2–4 h” con tooltip (icono i).
     - Etiquetas “Dentro/ Fuera 2–4h” en cada período.
     - Histograma con bins y tooltip de conteo/porcentaje.

3) Edición de eventos de alimentación:
   - Edita un evento de tipo biberón; debe abrirse con la cantidad en oz y guardar en ml al confirmar.
   - Edita un evento de tipo pecho; asegúrate que la duración (min) sea el campo principal.
   - Edita un evento de tipo sólidos; “Dormido” debe permanecer deshabilitado.

4) Lógica de alimentación nocturna:
   - Si el bebé está “dormido” y registras alimentación, sólo se debe crear `night_feeding` para líquidos (pecho/biberón), nunca para sólidos.

---

## Notas Operativas
- Ramas sincronizadas: `kenny` y `main` contienen estos cambios.
- No se cambió el esquema de base de datos; las conversiones de unidades se hacen en UI/lógica de envío.
- Si no ves datos suficientes, algunas métricas mostrarán estados de “aprendiendo tu rutina”.

---

## Cómo Actualizar Este Archivo
Añade entradas al final de “Cambios Principales” con:
- Título breve del cambio, “Qué”, “Dónde verlo”, “Archivos”.
- Mantén el foco en lo que afecta la experiencia del padre.
