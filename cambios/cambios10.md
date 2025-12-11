1. Cambios implementados para este ticket:

- Modal de registro manual de eventos (`components/events/ManualEventModal.tsx`)
  - En la pregunta **“¿Cuánto tardó en dormirse?”**, cuando el tipo de evento es **siesta (`nap`)** ahora aparece una opción extra:
    - `No se pudo dormir` (valor interno `no-sleep`).
  - Internamente:
    - Se guarda el selector como string (`sleepDelayValue`) y se convierte a minutos solo al construir el payload.
    - Si el usuario elige `No se pudo dormir`:
      - Se envía `sleepDelay = 0` (para mantener el rango válido 0–180).
      - Se agrega `didNotSleep = true` en el cuerpo del evento.
    - Al cambiar el tipo de evento se resetea el selector a `"0"` para evitar estados inválidos.

- API de eventos de niños (`app/api/children/events/route.ts`)
  - En el `POST`:
    - Se acepta el nuevo campo opcional `didNotSleep` del payload.
    - Se persiste en la colección canónica `events` y en la colección de analytics:
      - Documento `events`: se guarda `didNotSleep: boolean`.
      - Sync a analytics: también incluye `didNotSleep`.
  - En el `PATCH`:
    - Si el payload incluye `didNotSleep`, se actualiza:
      - `children.events.$.didNotSleep` en documentos embebidos.
      - Si el evento es de la colección `events` directa, también se actualizan `sleepDelay`, `awakeDelay` y `didNotSleep` cuando vienen en el cuerpo.

- Tipos y modelo de datos en frontend
  - `components/events/types.ts`:
    - Se agregó `didNotSleep?: boolean` a la interfaz `EventData`.
  - `app/dashboard/calendar/page.tsx`:
    - La interfaz local `Event` ahora incluye `didNotSleep?: boolean`.

- Cálculos compartidos de sueño (`lib/sleep-calculations.ts`)
  - `SleepEvent` ahora tiene `didNotSleep?: boolean` para que las estadísticas puedan distinguir intentos sin conseguir dormir.
  - `calculateAverageSleepDelay`:
    - Ahora **ignora** cualquier evento con `didNotSleep === true` para no contaminar los promedios de “tiempo para dormirse”.
  - `ProcessedSleepStats`:
    - Se añadió `avgNapSleepDelay: string` → tiempo promedio para dormirse en siestas.
  - `processSleepStatistics`:
    - Mantiene la métrica nocturna existente `bedtimeToSleepDifference` (tiempo para dormirse por la noche).
    - Calcula `avgNapSleepDelay` solo con siestas (`eventType === "nap"`) que tienen `sleepDelay` válido y no están marcadas con `didNotSleep`.

- Resumen del período en `/dashboard/calendar` (tab de estadísticas)
  - `MonthlyStats` ahora incluye:
    - `avgNightSleepDelay: string` (tiempo para dormirse en sueño nocturno, viene de `bedtimeToSleepDifference`).
    - `avgNapSleepDelay: string` (nuevo: promedio de tiempo para dormirse en siestas).
  - En el card **“Resumen del período”**:
    - Card “Sueño nocturno”:
      - Debajo del valor de horas se muestra, en letras chicas, el texto:
        - `Tiempo para dormir: {monthlyStats.avgNightSleepDelay}` cuando hay dato (`!== "--"`).
    - Card “Siestas”:
      - Debajo del valor de horas se muestra, en letras chicas:
        - `Tiempo para siesta: {monthlyStats.avgNapSleepDelay}` cuando hay dato.
    - Los cards de “Despertares” y “Hora de despertar” quedan sin subtítulo extra.

- Gráfica de tendencias del mes (`components/calendar/MonthLineChart.tsx`)
  - La interfaz `Event` de la gráfica ahora también conoce `didNotSleep?: boolean`.
  - Tooltip:
    - Para las series individuales de siesta (`nap1`, `nap2`, `nap3`), si alguno de los eventos del día tiene `didNotSleep === true`, en el tooltip se agrega una línea extra:
      - `Intento de siesta sin lograr dormir` en texto pequeño y color de alerta suave.
    - Esto hace que los intentos de siesta donde no se durmió:
      - Sigan apareciendo como puntos en la gráfica (porque se registran como eventos `nap` con `startTime`).
      - Se distingan explícitamente en el tooltip, para que sepas que fue un intento fallido y no una siesta real.

- Comportamiento final esperado
  - Cuando el papá/mamá registra una siesta y elige “No se pudo dormir”:
    - Se guarda como evento `nap` con `didNotSleep = true`.
    - No afecta los promedios de tiempo para dormirse (ni de noche ni de siesta).
    - Se ve como un punto en la gráfica de tendencias del mes, y el tooltip marca que fue “Intento de siesta sin lograr dormir”.
  - En el tab de estadísticas de `/dashboard/calendar` (lado admin y parent):
    - Bajo el card de “Sueño nocturno” ves el tiempo promedio que tarda en dormirse por la noche.
    - Bajo el card de “Siestas” ves el tiempo promedio que tarda en dormirse en las siestas.

- Modal rápido de siesta y estado del botón principal
  - `components/events/SleepDelayModal.tsx`:
    - Se agregó la opción **“No se pudo dormir”** también en el modal rápido de siesta.
    - Cuando está seleccionada:
      - El título de la sección emocional cambia a:  
        - `¿Cómo estaba {childName} al intentar tomar la siesta?`.
      - El texto central muestra “No se pudo dormir”, pero se siguen capturando estado emocional y notas.
  - `components/events/SleepButton.tsx`:
    - Cuando el modal rápido de siesta se confirma con “No se pudo dormir”:
      - Se registra inmediatamente un evento `nap` con:
        - `startTime` y `endTime` iguales (misma hora) → intento sin duración real.
        - `didNotSleep: true`.
        - `sleepDelay` (minutos seleccionados) y `emotionalState` / `notes`.
      - **No** se crea `sleepPending` y **no** se cambia `optimisticStatus` a `"napping"`.
      - El estado que ve el hook `use-sleep-state` sigue siendo `awake`: el botón se mantiene en modo “SIESTA / DORMIR”, no pasa a “SE DESPERTÓ” ni muestra “minutos durmiendo”.
    - Cuando el flujo es una siesta normal (sin “No se pudo dormir”):
      - Se mantiene el comportamiento anterior: se crea `sleepPending`, el estado pasa a “napping” y luego se cierra al registrar el despertar.

- Exclusión explícita de intentos fallidos en estadísticas de siesta
  - `lib/sleep-calculations.ts`:
    - En `aggregateDailySleep`:
      - Los eventos `nap` con `didNotSleep === true` quedan excluidos del cómputo de minutos de siesta diarios (no suman a `napMinutes` ni `avgNapHoursPerDay`).
    - En `processSleepStatistics`:
      - `avgNapDuration` se calcula solo con siestas reales (requieren `endTime` y `!didNotSleep`).
      - `avgNapSleepDelay` se calcula solo con siestas que tienen `sleepDelay` válido y `!didNotSleep`.
    - De esta forma:
      - Los intentos de siesta fallidos se ven en la gráfica como puntos (para contexto), pero no distorsionan la duración ni el delay promedio de siesta.

2. Archivos modificados en este cambio:

- `components/events/ManualEventModal.tsx`
- `components/events/types.ts`
- `app/api/children/events/route.ts`
- `lib/sleep-calculations.ts`
- `app/dashboard/calendar/page.tsx`
- `components/calendar/MonthLineChart.tsx`
- `components/events/SleepDelayModal.tsx`
- `components/events/SleepButton.tsx`
- `components/events/EventEditRouter.tsx`
