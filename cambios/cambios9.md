Vamos a realizar los siguientes cambios sin afectra nada de lo que ya funciona:

1. la sidebar principal, veo que desaparece cuando hacemos la pantalla mas chica cuando llegaa cierto punto peor quieor que no se corte por ningun lado, que sea independinete y que el user pueda colapsarla y descolpasarla semrpe que el quiera, me expclio?, algo sencillo sin mover tanto codigo, lo mas dry y mas aeficinete posible.

2. en la pagian de http://localhost:3000/dashboard/survey, cuando le pico siguiente, no queiro que se vaya al final de la siguieet tab,quieor que se vaya al principio de la siguiente tab, me expclio?

3. la pregunta de 7. Su hijo/a se alimenta en el tab de Desarrollo y salud: cambir las opciones a :
- Formula
- Leche materna
- Leche materna y fórmula
- Leche entera de vaca
- Otro
- Ninguno

y si responde "Otro", quiero que especifique cual , que aparecza el input text para que el user especifique que

4. en la pregunta 8. ¿Papá trabaja fuera de casa? en el tab de INFORMACIÓN FAMILIAR si responde que si: agregar input text para que ponga a que hora regresa de trabajar


5. en la pregynta 9. Su hijo/a: del tab de DESARROLLO Y SALUD, si pone el de "Es muy inquieto para dormir", agregar un input text para que pueda Describir lo inquieto o si patalea o gira mucho al dormir En pesadillas preguntar si es al PRI copio o final de la noche, si se calma con ellos. tambuien si checkea el de Tiene o ha tenido reflujo y/o cólicos que se agrege input text donde explique

6. en la pregunta 8. ¿Su hijo/a se queda dormido de forma independiente? del tab de RUTINA Y HÁBITOS DE SUEÑO si responde que no, agegar input text para que ponga como logras que se duerma

7. en la pregunta de 6. Su hijo/a utiliza: en el tab de DESARROLLO Y SALUD, agregar opcion de "Ambas"

8. quitar 27. ¿Cuál es la duración total de las siestas? en el tab de RUTINA Y HÁBITOS DE SUEÑO y cambiarilo por: "como lo duermen en las siestas" y agregar pregunta "Cuando viajes sientes que tu hijo duerme mejor o peor o igual Donde duerme en los viajes", recuerda checar bien los numeros de las preguntas para qeu siga el orden correcto.


Revisar la estrcutura de la base de datos de mong, ya hbaiamos creado un estrcutura de mongodb , es revisral y agregar o mdoificar en base a los requeirmientos nuevos, antes de hacer cualqueir moviemirno hay que analizar la estrcutura completa de como esta ahorita la estrcuctura de mongodb, coneectatte a mognodb, las claves estan en .env . no queiro que me afectes anda de lo que ya tenemos!.

---

ANÁLISIS PREVIO + IMPLEMENTACIÓN REALIZADA (cambios9)

0. Análisis y verificación de estructura MongoDB
- Revisado `docs/DATABASE.md`, `ANALISIS_CAMPOS_ENCUESTA.md`, `types/models.ts` (interfaz `SurveyData`) y `models/Child.ts` para entender cómo se guarda actualmente la encuesta.
- Revisado `app/api/survey/route.ts` y confirmado que:
  - La API usa `db.collection("children").updateOne({ _id, parentId }, { $set: { surveyData, surveyUpdatedAt } })`.
  - MongoDB acepta campos nuevos dentro de `surveyData` sin necesidad de migrar esquema en la base (esquema flexible).
- Ejecutado `node check-mongo.js` para conectarse a MongoDB y revisar un niño real (Jakito):
  - Confirmado que existen `surveyData.rutinaHabitos`, `surveyData.actividadFisica` y `surveyData.desarrolloSalud` con muchos campos ya usados (horaDespertar, numeroSiestas, etc.).
  - Verificados flags: `surveyData.completed`, `surveyData.isPartial`, `surveyData.completedAt`, `surveyData.lastSavedAt`.
- Conclusión: no se tocó la colección ni la API de escritura; solo se agregaron campos opcionales dentro de `surveyData` y se actualizó el modelo TypeScript para reflejar la realidad actual + nuevos campos, sin romper datos existentes.

1. Sidebar principal colapsable e independiente
- Archivo: `components/dashboard/sidebar.tsx`
  - Se añadió estado `collapsed` con `useState(false)` y se persiste en `localStorage` bajo la clave `sidebarCollapsed`.
  - En el `useEffect` se sincroniza una variable CSS global `--sidebar-width` con valores `"72px"` (colapsado) o `"256px"` (expandido).
  - Se reemplazó la `div` fija de sidebar por un contenedor con:
    - `style={{ width: "var(--sidebar-width, 256px)" }}` y `transition-[width]` para animar el cambio.
    - Un botón de toggle (iconos `ChevronLeft` / `ChevronRight`) que colapsa/expande el sidebar.
  - En modo colapsado:
    - Solo se muestran los iconos de los ítems de menú; el texto se oculta (`{!collapsed && item.title}`).
    - Botones de “Ayuda” y “Contacto” también muestran solo ícono cuando está colapsado, manteniendo el comportamiento.
- Archivo: `app/dashboard/layout.tsx`
  - Se aktualizó el contenedor principal del dashboard para usar la variable CSS:
    - Antes: `className="flex flex-col lg:ml-[256px]"`.
    - Ahora: `style={{ marginLeft: "var(--sidebar-width, 256px)" }}` para que el contenido nunca se corte y el sidebar sea realmente independiente del layout.

2. Navegación de encuesta: “Siguiente” va al principio de la siguiente tab
- Archivo: `components/survey/SurveyWizard.tsx`
  - Se agregó un `ref` `topRef` al contenedor principal del wizard:
    - `ref={topRef}` en el `div` que envuelve el wizard.
  - En la función `handleStepChange(newStep)`:
    - Después de `setCurrentStep(newStep)` se hace `topRef.current.scrollIntoView({ behavior: "smooth", block: "start" })` (o `window.scrollTo({ top: 0, behavior: "smooth" })` como respaldo).
    - Esto aplica tanto para “Siguiente”, “Anterior” como para clicks directos en el componente `SurveyProgress`.
  - El resto de lógica de validación se mantiene intacta (solo se añadió el scroll).

3. Desarrollo y Salud – pregunta 7 “Su hijo/a se alimenta de”
- Archivo: `components/survey/steps/HealthDevStep.tsx`
- Cambios en la sección de alimentación:
  - Opciones actualizadas a:
    - `Fórmula` (`value="formula"`).
    - `Leche materna` (`value="leche-materna"`).
    - `Leche materna y fórmula` (`value="materna-formula"`).
    - `Leche entera de vaca` (`value="leche-entera-vaca"`).
    - `Otro` (`value="otro"`) con input de texto condicional `alimentacionOtro` (ya existía, se reutiliza).
    - `Ninguno` (`value="ninguna"`).
  - Lógica:
    - Al seleccionar `Otro`, se mantiene `alimentacionOtro` y se muestra el input para especificar el tipo de alimentación.

4. Información Familiar – pregunta 8 “¿Papá trabaja fuera de casa?”
- Archivo: `components/survey/steps/FamilyInfoStep.tsx`
  - Sobre papá:
    - En la pregunta 8:
      - La selección ahora:
        - Si responde “Sí” (`value="si"`), se establece `trabajaFueraCasa: true` y se inicializa/retiene `horaRegresoTrabajo`.
        - Si responde “No” (`value="no"`), se mueve a `trabajaFueraCasa: false` y no se usa el campo de hora.
      - Debajo se agrega un input condicional:
        - Solo visible cuando `papa.trabajaFueraCasa === true`.
        - Campo: `papa.horaRegresoTrabajo`.
        - Texto: “¿A qué hora regresa de trabajar?”.
- Archivo: `types/models.ts`
  - En `SurveyData.informacionFamiliar.papa`:
    - Añadido: `horaRegresoTrabajo?: string`.
- Archivo: `components/survey/SurveySection.tsx`
  - Se agregó `horaRegresoTrabajo` a `SECTION_ALL_FIELDS.informacionFamiliar` y al mapa `FIELD_LABELS.informacionFamiliar` con label “Hora en que regresa de trabajar”.

5. Desarrollo y Salud – pregunta 9 “Su hijo/a”
- Archivo: `components/survey/steps/HealthDevStep.tsx`
  - Para el checkbox “Es muy inquieto para dormir” (`problemasHijo` incluye `"inquieto"`):
    - Se modificó el handler para:
      - Al marcar: mantener `descripcionInquieto` (si existe) o inicializarlo vacío.
      - Al desmarcar: limpiar `descripcionInquieto`.
    - Se añadió un input de texto condicional:
      - Campo: `descripcionInquieto`.
      - Texto de ayuda: “Describe cómo es inquieto (si patalea, gira mucho, etc.)”.
  - Para “Tiene o ha tenido reflujo y/o cólicos” (`"reflujo"`):
    - Handler:
      - Al marcar: mantiene `reflujoColicosDetalle`.
      - Al desmarcar: limpia `reflujoColicosDetalle`.
    - Input de texto condicional:
      - Campo: `reflujoColicosDetalle`.
      - Sirve para describir desde cuándo, síntomas, frecuencia, etc.
  - Para “Tiene o ha tenido pesadillas” (`"pesadillas"`):
    - Handler:
      - Al marcar: mantiene `pesadillasDetalle`.
      - Al desmarcar: limpia `pesadillasDetalle`.
    - Input de texto condicional:
      - Campo: `pesadillasDetalle`.
      - Pregunta: si es al principio o al final de la noche y si se calma fácilmente.
- Archivo: `types/models.ts`
  - En `SurveyData.desarrolloSalud` se añadieron:
    - `descripcionInquieto?: string`.
    - `reflujoColicosDetalle?: string`.
    - `pesadillasDetalle?: string`.
- Archivo: `components/survey/SurveySection.tsx`
  - Se agregaron estos campos a:
    - `SECTION_ALL_FIELDS.desarrolloSalud`.
    - `FIELD_LABELS.desarrolloSalud` con labels descriptivos.

6. Rutina y Hábitos de Sueño – pregunta 8 “¿Se queda dormido de forma independiente?”
- Archivo: `components/survey/steps/RoutineHabitsStep.tsx`
  - Se cambió el `onValueChange` de la pregunta 8:
    - Además de actualizar `duermeSolo`, ahora gestiona `comoLograDormir`.
    - Si `duermeSolo === true`: se limpia `comoLograDormir`.
    - Si `duermeSolo === false`: se preserva/crea `comoLograDormir`.
  - Se añadió un `Textarea` condicional:
    - Solo visible cuando `duermeSolo === false`.
    - Campo: `comoLograDormir`.
    - Texto: “¿Cómo logras que se duerma?” (ej: en brazos, pecho, paseándolo, etc.).
- Archivo: `types/models.ts`
  - En `SurveyData.rutinaHabitos` se añadió:
    - `comoLograDormir?: string`.
- Archivo: `components/survey/SurveySection.tsx`
  - `SECTION_ALL_FIELDS.rutinaHabitos` incluye ahora `comoLograDormir`.

7. Desarrollo y Salud – pregunta 6 “Su hijo/a utiliza” (opción “Ambas”)
- Archivo: `components/survey/steps/HealthDevStep.tsx`
  - En la sección 6 se agregó una tercera opción:
    - `RadioGroupItem value="ambas" id="utiliza-ambas"` con label “Ambas”.
  - El valor se sigue guardando en `hijoUtiliza`.
- Archivo: `types/models.ts`
  - Se flexibilizó el tipo:
    - `hijoUtiliza?: string[] | string` para tolerar el uso en UI actual.
  - `usoVaso?: "Vaso" | "Biberón" | "Ambas" | string`.

8. Rutina y Hábitos – pregunta 27 + nueva pregunta de viajes (orden corregido)
- Archivo: `components/survey/steps/RoutineHabitsStep.tsx`
  - Pregunta 27:
    - El label cambió de “¿Cuál es la duración total de las siestas?” a:
      - “27. ¿Cómo lo duermen en las siestas?”.
    - Se reutiliza el campo `duracionTotalSiestas` pero ahora contiene texto descriptivo del “cómo”, no solo tiempo.
  - Pregunta 28 nueva:
    - Label: “Cuando viajas, ¿sientes que tu hijo duerme mejor, peor o igual? ¿Dónde duerme en los viajes?”
    - Radios sobre `duermeMejorViaja` con opciones:
      - “Mejor”.
      - “Peor”.
      - “Igual”.
    - Input de texto para el lugar:
      - Campo: `dondeDuermeViaja` (y se sincroniza también `dondeViermesViaja` para compatibilidad con el modelo legacy).
  - Pregunta 29:
    - “¿Dónde toma las siestas?” (antes era 28; se renumeró).
  - Preguntas 30–33:
    - 30: principal preocupación.
    - 31: desde cuándo existe el problema.
    - 32: objetivo de los padres (sigue siendo obligatoria).
    - 33: información adicional.
- Archivo: `types/models.ts`
  - Ya existían:
    - `dondeViermesViaja?: string`.
    - `dondeDuermeViaja?: string`.
    - `duermeMejorViaja?: "Mejor" | "Peor" | "No aplica" | string`.
  - Solo se reutilizaron estos campos, sin cambios en la forma en que se guardan.
- Archivo: `components/survey/SurveySection.tsx`
  - `SECTION_ALL_FIELDS.rutinaHabitos` ahora incluye:
    - `duermeMejorViaja`, `dondeDuermeViaja`.
  - Labels añadidos en `FIELD_LABELS.rutinaHabitos`.

9. Ajustes en modelos / tipos (sin romper Mongo)
- `types/models.ts`:
  - Cambios resumidos:
    - `informacionFamiliar.papa`: nuevo `horaRegresoTrabajo?: string`.
    - `desarrolloSalud`:
      - `usoVaso` ampliado a `"Ambas" | string`.
      - `alimentacion` ampliado para soportar las nuevas etiquetas (“Leche materna”, “Leche entera de vaca”, etc.).
      - Nuevos campos de detalle: `descripcionInquieto`, `reflujoColicosDetalle`, `pesadillasDetalle`.
      - Tipo de `hijoUtiliza` flexibilizado a `string[] | string`.
    - `rutinaHabitos`:
      - Nuevo `comoLograDormir?: string`.
      - Se aprovechan campos ya presentes para viajes (`duermeMejorViaja`, `dondeDuermeViaja`, `dondeViermesViaja`).
- `models/Child.ts` (Mongoose):
  - No se modificó el schema Mongoose clásico; se mantiene igual para no introducir riesgos.
  - La escritura de encuesta real pasa por la API con el driver nativo de Mongo, que ya aceptaba campos extra en `surveyData`.

Con todo esto, los cambios responden a los puntos 1–8 de este documento y se hicieron después de revisar la estructura actual de Mongo y el flujo de guardado, evitando tocar lo que ya funciona (API y colecciones existentes).  
