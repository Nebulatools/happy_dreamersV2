# QA Release Notes - Sprint 5 (Automation Tasks)

**Fecha:** 2026-02-18
**Sprint:** Automation Tasks Queue (Mira) + Infraestructura
**Tester:** Julio
**URL:** https://happy-dreamers.vercel.app (o localhost:3000)

---

## Resumen de Cambios

| Area | Tasks | Estado |
|------|-------|--------|
| Survey - Cuestionario | T6, T7, T8, T9, T10, T11, T12 | COMPLETADO |
| Diagnostico Admin | T1, T2, T3 | COMPLETADO |
| Planes AI | T4 | COMPLETADO |
| Buscador Admin | T5 | COMPLETADO |
| Percentiles OMS | T13 | COMPLETADO |
| Infra (MongoDB/Sentry) | 3 fixes | COMPLETADO |
| Tests unitarios | 79 tests | COMPLETADO |

---

# PRUEBAS DEL CUESTIONARIO (SURVEY)

## TEST 1: Orden de preguntas - Siestas antes de Viajes (T6)

**Ruta:** Survey > Paso "Rutina y Habitos"

### Pasos

1. Login como PADRE (eljulius@nebulastudios.io / juls0925)
2. Ir al cuestionario de sueno de un nino
3. Navegar al paso "Rutina y Habitos"
4. Localizar las preguntas sobre siestas y viajes

### Verificar

- [ ] La pregunta sobre siestas aparece ANTES que la de viajes
- [ ] El orden se siente natural y logico
- [ ] Los datos existentes de surveys anteriores no se pierden

---

## TEST 2: Hora de despertar con rango from/to (T7)

**Ruta:** Survey > Paso "Rutina y Habitos"

### Pasos

1. Login como PADRE
2. Ir al cuestionario del nino
3. Navegar al paso "Rutina y Habitos"
4. Localizar la pregunta "A que hora se despierta"

### Verificar

- [ ] Aparecen DOS campos de hora: "Desde" y "Hasta"
- [ ] Ambos campos permiten seleccionar hora
- [ ] Al guardar, ambos valores persisten
- [ ] Si el nino tenia un valor unico (survey anterior), se muestra correctamente sin error

### Edge Cases

- [ ] Dejar un campo vacio y guardar - no debe crashear
- [ ] Ingresar rango invertido (ej: 8:00 desde, 6:00 hasta) - no debe crashear

---

## TEST 3: Opcion "Luz mercurial" en oscuridad del cuarto (T8)

**Ruta:** Survey > Paso "Rutina y Habitos" > Seccion de oscuridad/luz

### Pasos

1. Login como PADRE
2. Ir al cuestionario del nino
3. Navegar al paso "Rutina y Habitos"
4. Localizar la pregunta sobre tipo de luz o oscuridad del cuarto

### Verificar

- [ ] Existe la opcion "Luz mercurial" en la lista de opciones
- [ ] Se puede seleccionar
- [ ] Al guardar, la seleccion persiste
- [ ] Las demas opciones existentes siguen funcionando

---

## TEST 4: Ferritina reestructurada - Pregunta neutral y condicional (T9)

**Ruta:** Survey > Paso "Desarrollo y Salud"

### Pasos

1. Login como PADRE
2. Ir al cuestionario del nino
3. Navegar al paso "Desarrollo y Salud"
4. Localizar la seccion de ferritina

### Verificar Flujo Condicional

- [ ] Primero aparece la pregunta "Le han hecho estudios de ferritina?" (si/no)
- [ ] Si responde "No": NO aparece campo numerico
- [ ] Si responde "Si": aparece campo numerico para ingresar valor en ng/mL
- [ ] El campo numerico acepta valores positivos
- [ ] NO pregunta "tiene ferritina baja?" (eso era sesgo diagnostico)

### Verificar Persistencia

1. Responder "Si" e ingresar valor 35
2. Guardar survey
3. Salir y volver a entrar

- [ ] La respuesta "Si" persiste
- [ ] El valor 35 persiste
- [ ] Cambiar a "No" y guardar - el campo numerico desaparece

### Verificar Integracion con Diagnostico (Admin)

1. Ingresar ferritina = 35 y guardar
2. Login como ADMIN (mariana@admin.com / password)
3. Ir a Diagnosticos > Seleccionar el nino

- [ ] G2 muestra alerta de ferritina baja (<50 ng/mL)
- [ ] Muestra el valor exacto ingresado

---

## TEST 5: Preguntas de salud nuevas (T10)

**Ruta:** Survey > Paso "Desarrollo y Salud"

### Pasos

1. Login como PADRE
2. Ir al cuestionario del nino
3. Navegar al paso "Desarrollo y Salud"
4. Localizar las nuevas preguntas de salud

### Verificar

- [ ] Existe pregunta sobre "Otros doctores que lo atienden"
- [ ] Es un campo de texto libre
- [ ] Existe pregunta sobre "Estudios medicos realizados"
- [ ] Es un campo de texto libre
- [ ] Los campos son condicionales: solo aparecen si responde "si" a una pregunta padre
- [ ] Al guardar, los textos persisten

---

## TEST 6: Preguntas de lactancia nuevas (T11)

**Ruta:** Survey > Paso de historia del nino / Informacion familiar

### Pasos

1. Login como PADRE
2. Ir al cuestionario del nino
3. Navegar al paso correspondiente
4. Localizar las nuevas preguntas de lactancia

### Verificar

- [ ] Existe campo de frecuencia de lactancia nocturna
- [ ] Existe campo de duracion promedio de toma
- [ ] Existe campo de tipo de lactancia (exclusiva/mixta/formula)
- [ ] Existe campo de edad de inicio de formula (condicional)
- [ ] Los campos condicionales aparecen/desaparecen segun el tipo de alimentacion
- [ ] Al guardar, todos los valores persisten

---

## TEST 7: Scroll hijacking corregido en inputs numericos (T12)

**Ruta:** Survey > Cualquier paso con inputs numericos

### Pasos

1. Login como PADRE
2. Ir al cuestionario del nino
3. Navegar a un paso que tenga campos numericos (peso, talla, edad, ferritina)
4. Posicionar el cursor sobre un campo numerico
5. Intentar hacer scroll con el mouse/trackpad

### Verificar

- [ ] Al hacer scroll sobre un input numerico, la PAGINA scrollea (no el valor del input)
- [ ] El valor del input NO cambia al hacer scroll
- [ ] Verificar en al menos 3 inputs numericos diferentes
- [ ] En movil: verificar que el teclado numerico aparece correctamente

---

## TEST 8: Compatibilidad con surveys existentes (Todos los tests de Survey)

**Objetivo:** Verificar que surveys anteriores al Sprint 5 no se rompen

### Pasos

1. Login como PADRE
2. Ir al cuestionario de un nino con survey YA guardado (antes de este sprint)
3. Navegar por TODOS los pasos sin editar nada

### Verificar

- [ ] Todos los pasos cargan sin error
- [ ] Los datos existentes se muestran correctamente
- [ ] Los campos nuevos (rango despertar, ferritina condicional, lactancia) aparecen vacios pero funcionales
- [ ] NO se pierde ningun dato existente al guardar sin modificar los campos nuevos

---

# PRUEBAS DEL PANEL DE DIAGNOSTICO (ADMIN)

## TEST 9: Acordeon desplegable en tarjetas G1-G4 (T2)

**Ruta:** `/dashboard/diagnosticos/[childId]`

### Pasos

1. Login como ADMIN (mariana@admin.com / password)
2. Ir a Diagnosticos > Seleccionar un paciente con plan activo
3. Localizar las tarjetas G1 (Horario), G2 (Medico), G3 (Alimentacion), G4 (Ambiental)

### Verificar

- [ ] Cada tarjeta tiene un header clickeable que funciona como acordeon
- [ ] Al hacer click en el header, el contenido se expande con animacion
- [ ] Dentro del area expandida se ven los sintomas/criterios especificos
- [ ] Cada sintoma individual mantiene su icono de estado (rojo/amarillo/verde)
- [ ] Se puede colapsar el acordeon haciendo click nuevamente
- [ ] El acordeon funciona en las 4 tarjetas (G1, G2, G3, G4)

---

## TEST 10: Fallbacks de survey en reglas de horario G1 (T3)

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G1

### Prerrequisito

Usar un nino que tenga cuestionario completado pero POCOS eventos en bitacora.

### Pasos

1. Login como ADMIN
2. Ir a Diagnosticos > Seleccionar paciente
3. Revisar seccion G1 (Horario)

### Verificar

- [ ] Si el nino tiene datos de bitacora, esos se usan (prioridad)
- [ ] Si NO tiene datos de bitacora pero SI tiene survey, muestra datos del survey
- [ ] Hora de despertar del survey aparece reflejada en G1
- [ ] Numero de siestas del survey aparece reflejado en G1
- [ ] NO muestra "0/7 datos disponibles" si el survey tiene las respuestas
- [ ] Los indicadores se calculan correctamente con datos del survey

---

## TEST 11: Precision del Pasante AI (T1)

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion Pasante AI

### Pasos

1. Login como ADMIN
2. Ir a Diagnosticos > Seleccionar un paciente
3. Click en "Analizar" en la seccion del Pasante AI
4. Leer el resumen generado

### Verificar Terminologia

- [ ] NO aparece "Dra." ni "Doctora" asociado a Mariana
- [ ] Usa "Mariana" o "Especialista en Sueno" como titulo
- [ ] Diferencia claramente entre "despertares al inicio de la noche" y "early rising" (despertar muy temprano)
- [ ] NO usa terminos ambiguos como "despertares tempranos" sin contexto

### Verificar Falsos Positivos

- [ ] Si el survey del nino NO marca reflujo, el pasante NO menciona reflujo
- [ ] Si el nino tiene 3 comidas registradas, el pasante reconoce "3 solidos" (no marca "Solidos 0")
- [ ] El pasante solo reporta condiciones medicas que REALMENTE estan en el survey/bitacora

### Verificar Calidad General

- [ ] El resumen es coherente y descriptivo
- [ ] Las recomendaciones son generales (no da dosis ni horarios especificos)
- [ ] Cruza informacion entre grupos cuando es relevante

---

# PRUEBAS DE ADMIN TOOLS

## TEST 12: Buscador de pacientes A-Z con filtro activos (T5)

**Ruta:** `/dashboard/diagnosticos` o cualquier pagina admin con selector de pacientes

### Pasos

1. Login como ADMIN
2. Ir a la pagina de Diagnosticos
3. Abrir el selector/buscador de pacientes

### Verificar

- [ ] Los pacientes aparecen ordenados alfabeticamente (A-Z)
- [ ] Solo se muestran pacientes activos (con plan activo o eventos recientes)
- [ ] NO aparecen pacientes sin actividad
- [ ] La busqueda por nombre funciona correctamente
- [ ] La busqueda es rapida (no hay lag al escribir)

---

# PRUEBAS DE PLANES AI

## TEST 13: Vocabulario diversificado en planes (T4)

**Ruta:** `/dashboard/consultas` > Generar nuevo plan

### Prerrequisito

Tener un nino con datos suficientes para generar un plan.

### Pasos

1. Login como ADMIN
2. Ir a Consultas > Seleccionar paciente
3. Generar un nuevo plan AI

### Verificar

- [ ] El plan generado NO repite siempre "desayuno", "comida", "cena"
- [ ] Usa variaciones como "almuerzo", "lunch", "merienda", o nombres de platillos
- [ ] El lenguaje del plan se siente mas natural y personalizado
- [ ] Los horarios y reglas clinicas siguen siendo correctos

---

# PRUEBAS DE PERCENTILES

## TEST 14: Percentiles de peso y talla con OMS (T13)

**Ruta:** Perfil del nino o cualquier componente que muestre percentiles

### Pasos

1. Login como PADRE o ADMIN
2. Ir al perfil de un nino que tenga peso y talla registrados
3. Localizar donde se muestran los percentiles

### Verificar

- [ ] El percentil de peso se muestra correctamente
- [ ] El percentil de talla se muestra correctamente
- [ ] Para un nino de 12 meses con ~10 kg, el percentil de peso esta entre 30-70 (rango normal)
- [ ] Los valores no son negativos ni superiores a 100
- [ ] Funciona tanto para ninos como para ninas

### Verificar con Valores Conocidos (OMS)

Referencia rapida para validacion manual:
- Nino, 12 meses, 10 kg -> percentil ~50
- Nina, 12 meses, 9.5 kg -> percentil ~50
- Si los valores estan MUY lejos de estos rangos, reportar como bug

---

# PRUEBAS DE INFRAESTRUCTURA

## TEST 15: Estabilidad general (MongoDB + Sentry)

**Objetivo:** Verificar que la app no tiene errores de conexion ni crashes

### Pasos

1. Abrir la app despues de un periodo de inactividad (>5 min sin usar)
2. Navegar por varias secciones rapidamente

### Verificar

- [ ] La primera carga no muestra error de conexion (cold start mejorado)
- [ ] No aparecen errores de "MongoDB timeout" en la consola
- [ ] Navegar entre secciones es fluido sin errores 500
- [ ] Si hay un error, verificar en Sentry (sentry.io) que queda registrado

---

# PRUEBAS DE INTEGRACION

## TEST 16: Flujo completo Survey -> Diagnostico

### Pasos

1. Login como PADRE
2. Ir al cuestionario de un nino
3. Llenar/editar los campos nuevos:
   - Rango de hora de despertar (ej: 6:30 - 7:15)
   - Ferritina: responder "Si" e ingresar 30
   - Preguntas de salud (otros doctores, estudios)
   - Preguntas de lactancia
4. Guardar survey
5. Logout
6. Login como ADMIN
7. Ir a Diagnosticos > Seleccionar el mismo nino

### Verificar

- [ ] G1 refleja el rango de despertar del survey (si no hay bitacora)
- [ ] G2 muestra alerta de ferritina baja (30 < 50)
- [ ] El Pasante AI integra los datos nuevos en su analisis
- [ ] Los acordeones del diagnostico muestran los sintomas correctos

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario/Padre | eljulius@nebulastudios.io | juls0925 |

---

## Reporte de Bugs

Si encuentras un bug, documenta en `QA_FEEDBACK_NOTES.md`:

1. **Test #:** Numero del test que fallo
2. **Ruta:** URL donde ocurrio
3. **Pasos para reproducir:** Numerados
4. **Resultado esperado:** Que deberia pasar
5. **Resultado actual:** Que paso realmente
6. **Screenshot:** Si es visual
7. **Consola:** Errores en DevTools (F12)

---

## Archivos Modificados en este Sprint

| Archivo | Cambio |
|---------|--------|
| `app/api/consultas/plans/route.ts` | Vocabulario diversificado en prompts |
| `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` | UI acordeon para G1-G4 |
| `components/dashboard/patient-quick-selector.tsx` | Orden A-Z, filtro activos |
| `components/survey/SurveySection.tsx` | NUEVO: Wrapper anti-scroll-hijack |
| `components/survey/steps/ChildHistoryStep.tsx` | Preguntas de lactancia |
| `components/survey/steps/FamilyInfoStep.tsx` | Ajustes lactancia |
| `components/survey/steps/HealthDevStep.tsx` | Ferritina neutral, preguntas salud |
| `components/survey/steps/PhysicalActivityStep.tsx` | Anti-scroll en inputs |
| `components/survey/steps/RoutineHabitsStep.tsx` | Orden siestas/viajes, rango despertar, luz mercurial |
| `lib/diagnostic/rules/schedule-rules.ts` | Fallbacks de survey para G1 |
| `lib/diagnostic/pasante-ai-prompt.ts` | Precision terminologica |
| `lib/diagnostic/rules/medical-rules.ts` | Mapeo reflujo, ferritina |
| `lib/diagnostic/rules/nutrition-rules.ts` | Brechas survey-diagnostico |
| `lib/growth/weight-percentile.ts` | Tablas OMS LMS peso |
| `lib/growth/height-percentile.ts` | NUEVO: Tablas OMS LMS talla |
| `lib/mongodb.ts` | Timeouts 15s + retry logic |
| `types/models.ts` | Campos nuevos de survey |
| `sentry.*.config.ts` (3 archivos) | DSN hardcoded fallback |
| 8 archivos de API | Sentry.captureException en catch blocks |

---

*Generado el 2026-02-18 - Sprint 5: Automation Tasks Queue*
