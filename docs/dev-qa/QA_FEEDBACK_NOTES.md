# QA Feedback Notes

**Fecha:** 2026-02-05
**Sprint:** Panel de Diagnostico + Mejoras Survey + Pasante AI Extendido

## TEST 1: Acceso Admin-Only

- La ruta no es accesible desde Menú pero si se escribe sí deja navegar aunque no muestra nada, página carga con error de "Algo salió mal", pero lo correcto sería que debería redirigir a /dashboard sin errores.

- La vista diagnóstico con perfil Admin tampoco cargó, mismo error de "Ups!, Algo salió mal" desplegado.

## TEST 2: Panel de Diagnostico - Vista General

- No se puede testear

### Pasos

1. Login como ADMIN
2. Seleccionar un nino con plan activo
3. Ir a su panel de diagnostico

### Verificar

- [ ] Se muestra el perfil del nino (nombre, edad, plan activo)
- [ ] Se muestran 4 tarjetas/grupos de validacion (G1, G2, G3, G4)
- [ ] Cada grupo tiene indicador de estado (ok verde, warning amarillo, alert rojo)
- [ ] Si el nino NO tiene plan activo, muestra mensaje bloqueante

---

## TEST 3: G1 - Validacion de Horario

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G1
| G1 Horario | Validacion de horarios vs plan activo | COMPLETADO |

### Verificar Reglas

- [ ] Compara hora real de despertar vs hora meta del plan
- [ ] Muestra alerta si desvio es > ±15 minutos
- [ ] Alerta si despertar es antes de 6:00 AM
- [ ] Valida duracion de noche segun edad (11h hasta 2.5 anos)
- [ ] Valida ventanas de sueno por tabla de edad

### Verificar Siestas (segun edad del nino)

| Edad | Siestas Esperadas | Verificar |
|------|-------------------|-----------|
| 6 meses | 3 siestas | [ ] Valida ventanas 1.5, 2, 2.5, 2.5-3 hrs |
| 8-9 meses | 2 siestas | [ ] Valida ventanas 3, 3, 2.5-3 hrs |
| 15-18 meses | 1 siesta | [ ] Siesta no antes de 12 PM |
| >3 anos | 0 siestas | [ ] Alerta si siesta despues de 2 PM |

### Verificar UI

- [ ] Criterios que pasan muestran check verde
- [ ] Criterios que fallan muestran X roja o warning amarillo
- [ ] Click en criterio muestra detalle en modal

---

## TEST 4: G2 - Indicadores Medicos

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G2
| G2 Medico | Indicadores de reflujo, apnea, RLS | COMPLETADO |

### Verificar Umbral de Activacion

- [ ] Con 1 SOLO indicador presente, ya se dispara la alerta del grupo
- [ ] El grupo tiene 3 subsecciones: Reflujo, Apnea/Alergias, Restless Leg

### 4.1 Indicadores de Reflujo

- [ ] Detecta "reflujo" o "colicos" del survey
- [ ] Detecta percentil bajo de peso
- [ ] Detecta congestion nasal
- [ ] Detecta dermatitis/eczema
- [ ] (Sprint 4B) Detecta sub-checkboxes: vomita frecuente, llora al comer, arquea espalda

### 4.2 Indicadores de Apnea/Alergias

- [ ] Detecta congestion nasal, infecciones oido
- [ ] Detecta ronquidos
- [ ] Detecta respiracion por boca
- [ ] Detecta inquieto segunda parte de noche (despues de medianoche)
- [ ] Detecta sudoracion nocturna
- [ ] Detecta mucha pipi nocturna
- [ ] Detecta pesadillas al final de la noche

### 4.3 Indicadores de Restless Leg (RLS)

- [ ] Detecta inquieto primera parte de noche
- [ ] Detecta terrores nocturnos
- [ ] Detecta tarda >30 min en dormirse
- [ ] (Sprint 4B) Detecta pataleo nocturno
- [ ] (Sprint 4B) Detecta piernas inquietas
- [ ] (Sprint 4B) Detecta ferritina < 50 ng/mL (si dato disponible)

### Verificar Datos Pendientes

- [ ] Si faltan indicadores del survey, muestra "X indicadores pendientes"
- [ ] Indicadores sin datos muestran estado "warning" con mensaje claro

---

## TEST 5: G3 - Validacion de Alimentacion

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G3
| G3 Alimentacion | Clasificacion AI de alimentos | COMPLETADO |

### Verificar Clasificacion AI

- [ ] Eventos de tipo "feeding" con notas se clasifican automaticamente
- [ ] Clasificacion en grupos: proteina, carbohidratos, grasa, fibra
- [ ] Si AI no puede clasificar, muestra "sin clasificar"

### Verificar Reglas por Edad

| Edad | Verificar |
|------|-----------|
| 6-9 meses | [ ] Minimo 3-5 tomas de leche |
| 6-9 meses | [ ] Solidos: Proteina + Fibra + (Grasa O Carbo) |
| 9+ meses comida | [ ] Proteina + Grasa + Carbo + Fibra |
| 9+ meses snack | [ ] Fibra + (Grasa O Carbo) |
| 12+ meses | [ ] Alerta si leche > 16 oz diarias |

### Verificar UI

- [ ] Muestra resumen de comidas del dia
- [ ] Indica si grupos nutricionales estan completos
- [ ] Muestra alerta si falta alguna categoria

---

## TEST 6: G4 - Factores Ambientales

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G4
| G4 Ambiental | Pantallas, temperatura, colecho, cambios | COMPLETADO |

### Verificar Indicadores

#### Pantallas
- [ ] Alerta si >1 hora de pantalla al dia
- [ ] Alerta si pantallas 2 horas antes de bedtime
- [ ] Dato viene del survey campo tiempo de pantalla

#### Temperatura
- [ ] OK si temperatura entre 22-25°C
- [ ] Alerta si fuera de rango
- [ ] Dato viene del survey

#### Humedad (Sprint 4B)
- [ ] OK si humedad es "normal"
- [ ] Warning si humedad es "seca" o "humeda"
- [ ] Si no hay dato, no alerta (campo opcional)

#### Depresion Post-Parto
- [ ] Siempre muestra si esta marcado en survey
- [ ] Es indicador informativo (no necesariamente alerta)

#### Colecho
- [ ] Alerta si se detecta colecho (riesgo SIDS)
- [ ] Dato viene del survey

#### Cambios Recientes
- [ ] Detecta keywords en notas de eventos y chat
- [ ] Keywords: kinder, guarderia, hermano, mudanza, separacion, viaje
- [ ] Muestra los cambios detectados en el panel

---

## TEST 7: Deep Links y Modal de Detalle

**Ruta:** Click en cualquier criterio del panel

### Verificar

- [ ] Al hacer click en un criterio, abre modal overlay
- [ ] Modal es solo lectura (no se puede editar)
- [ ] Muestra desglose del criterio
- [ ] Si el dato viene del survey, muestra link al campo del survey
- [ ] Si el dato viene de evento, muestra link al evento
- [ ] Se puede cerrar el modal con X o click fuera

---

## TEST 8: Pasante AI - Analisis On-Demand

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion Pasante AI
| Pasante AI | Resumen descriptivo on-demand | COMPLETADO |

### Pasos

1. Localizar la seccion "Analisis del Pasante AI"
2. Click en boton "Analizar"

### Verificar

- [ ] Muestra estado de carga mientras genera
- [ ] Despues de unos segundos, muestra el resumen AI
- [ ] Resumen describe la situacion del nino
- [ ] Incluye recomendaciones generales (NO medicas directas)
- [ ] Boton "Regenerar" permite volver a analizar

### Verificar Contenido del Resumen

- [ ] Menciona alertas de los 4 grupos si existen
- [ ] Cruza informacion entre grupos (ej: reflujo + despertares)
- [ ] NO da dosis de medicamentos
- [ ] NO da horarios especificos (eso es trabajo de Mariana)
- [ ] Usa lenguaje descriptivo, no tecnico

### (Sprint 4B) Verificar Texto Libre

Si el nino tiene notas de eventos o mensajes de chat de los ultimos 14 dias:

- [ ] Indica "(incluye analisis de texto libre)" en la descripcion
- [ ] El resumen incluye seccion "Hallazgos del texto libre"
- [ ] Extrae sintomas mencionados en el texto
- [ ] Detecta cambios familiares mencionados

---

## TEST 9: CTAs - Editar Plan / Generar Nuevo Plan

**Ruta:** Final del panel de diagnostico
| CTAs | Editar Plan / Generar Nuevo Plan | COMPLETADO |

### Verificar

- [ ] Boton "Editar Plan Actual" visible
- [ ] Click redirige al editor del plan activo del nino
- [ ] Boton "Generar Nuevo Plan" visible (puede ser placeholder)

---

# SPRINT 4B - MEJORAS AL SURVEY

## TEST 10: Checkboxes Condicionales de Reflujo
| Reflujo Details | Sub-checkboxes condicionales | COMPLETADO |

**Ruta:** Survey > Paso de Desarrollo y Salud

### Pasos

1. Login como USUARIO/PADRE
2. Ir a editar el survey del nino
3. Navegar al paso de Desarrollo y Salud
4. Localizar seccion de problemas del hijo

### Verificar

- [ ] Existe checkbox "Reflujo" en la lista de problemas
- [ ] Al marcar "Reflujo", aparecen sub-checkboxes debajo (indentados)
- [ ] Sub-checkboxes disponibles:
  - [ ] "Vomita frecuentemente"
  - [ ] "Arquea la espalda al comer"
  - [ ] "Llora al comer o despues"
- [ ] Al DESMARCAR "Reflujo", los sub-checkboxes desaparecen
- [ ] Los sub-checkboxes seleccionados se limpian al desmarcar reflujo
- [ ] Al guardar survey, los datos persisten correctamente

---

## TEST 11: Checkboxes de Restless Leg Syndrome

**Ruta:** Survey > Paso de Desarrollo y Salud
| Restless Leg | 3 checkboxes nuevos + ferritina | COMPLETADO |

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Desarrollo y Salud
4. Localizar seccion de Sindrome de Piernas Inquietas

### Verificar

- [ ] Existe seccion separada para "Sindrome de Piernas Inquietas"
- [ ] Contiene 3 checkboxes:
  - [ ] "Pataleo nocturno al dormirse"
  - [ ] "Piernas inquietas que necesitan movimiento"
  - [ ] "Despierta quejandose de las piernas"
- [ ] Cada checkbox puede marcarse independientemente
- [ ] Al guardar, los datos persisten

---

## TEST 12: Campo de Ferritina

**Ruta:** Survey > Paso de Desarrollo y Salud

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Desarrollo y Salud
4. Localizar seccion de informacion medica adicional

### Verificar

- [ ] Campo numerico "Nivel de ferritina (ng/mL)"
- [ ] Placeholder dice "Ej: 45"
- [ ] Campo NO es obligatorio
- [ ] Acepta valores numericos positivos
- [ ] Muestra texto de ayuda sobre el umbral (< 50 ng/mL es bajo)
- [ ] Al guardar, el valor persiste

### Verificar Integracion con G2

1. Ingresar valor < 50 (ej: 35)
2. Guardar survey
3. Login como ADMIN
4. Ir al panel de diagnostico del nino

- [ ] G2 muestra alerta de ferritina baja
- [ ] Indica el valor exacto ingresado

---

## TEST 13: Campo de Humedad

**Ruta:** Survey > Paso de Rutina y Habitos
| Humedad | Campo select (seca/normal/humeda) | COMPLETADO |

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Rutina y Habitos
4. Localizar seccion de ambiente de la habitacion (despues de temperatura)

### Verificar

- [ ] Campo select "Humedad de la habitacion"
- [ ] Opciones: "Seca", "Normal", "Humeda"
- [ ] Campo NO es obligatorio (puede dejarse vacio)
- [ ] Al guardar, la seleccion persiste

### Verificar Integracion con G4

1. Seleccionar "Seca" o "Humeda"
2. Guardar survey
3. Login como ADMIN
4. Ir al panel de diagnostico del nino

- [ ] G4 muestra warning para humedad no optima
- [ ] "Normal" no muestra warning

---

## TEST 14: Lista de Hermanos

**Ruta:** Survey > Paso de Dinamica Familiar
| Hermanos | Lista con nombre + fecha nacimiento | COMPLETADO |

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Dinamica Familiar
4. Localizar seccion de hermanos

### Verificar UI

- [ ] Existe boton "Agregar hermano"
- [ ] Al agregar, aparece fila con campos:
  - [ ] Nombre (texto)
  - [ ] Fecha de nacimiento (date picker)
  - [ ] Checkbox "Es el que necesita ayuda" (opcional)
  - [ ] Boton eliminar (X o icono trash)
- [ ] La edad se calcula y muestra automaticamente
- [ ] Se pueden agregar hasta 10 hermanos
- [ ] Despues de 10, el boton "Agregar" desaparece
- [ ] Se puede eliminar cualquier hermano de la lista

### Verificar Persistencia

1. Agregar 2-3 hermanos con datos completos
2. Guardar survey
3. Salir y volver a entrar al survey

- [ ] Los hermanos agregados persisten
- [ ] Los nombres estan correctos
- [ ] Las fechas estan correctas
- [ ] Las edades se calculan correctamente

### Verificar Edad Calculada

- [ ] Nino de 6 meses muestra "6 meses"
- [ ] Nino de 18 meses muestra "1 ano y 6 meses"
- [ ] Nino de 36 meses muestra "3 anos"

---

## TEST 15: Pasante AI - Analisis de Texto Libre (Sprint 4B)

**Ruta:** Panel de Diagnostico > Pasante AI
| Pasante AI | Analisis de texto libre (eventos + chat) | COMPLETADO |

### Prerrequisito

El nino debe tener:
- Eventos con notas en los ultimos 14 dias
- Y/O mensajes de chat en los ultimos 14 dias

### Pasos

1. Login como ADMIN
2. Ir al panel de diagnostico de un nino con texto libre
3. Verificar que indica "(incluye analisis de texto libre)"
4. Click en "Analizar"

### Verificar

- [ ] El resumen incluye seccion "Hallazgos del texto libre:"
- [ ] Extrae sintomas mencionados en notas (ej: "vomita despues del biberon")
- [ ] Detecta cambios de vida mencionados (ej: "empezamos guarderia")
- [ ] Relaciona hallazgos con los grupos G1-G4
- [ ] NO inventa informacion que no esta en el texto

### Sin Texto Libre

Si el nino NO tiene notas ni chat:

- [ ] NO muestra "(incluye analisis de texto libre)"
- [ ] Resumen se genera normalmente sin esa seccion

---

# PRUEBAS DE INTEGRACION

## TEST 16: Flujo Completo - Nuevo Survey a Diagnostico

### Pasos

1. Login como PADRE
2. Crear nuevo nino O editar survey existente
3. Llenar campos nuevos:
   - Marcar "Reflujo" + sub-checkboxes
   - Marcar checkboxes de RLS
   - Ingresar ferritina (ej: 40)
   - Seleccionar humedad "Seca"
   - Agregar 1 hermano
4. Guardar survey
5. Logout
6. Login como ADMIN
7. Ir al panel de diagnostico del nino

### Verificar

- [ ] G2 detecta indicadores de reflujo con detalles
- [ ] G2 detecta indicadores de RLS
- [ ] G2 muestra alerta de ferritina baja (< 50)
- [ ] G4 muestra warning de humedad seca
- [ ] Pasante AI incluye estos hallazgos en su resumen

---

## TEST 17: Compatibilidad con Surveys Existentes

**Objetivo:** Verificar que surveys antiguos sin los nuevos campos funcionan correctamente

### Pasos

1. Usar un nino que tenga survey ANTES de Sprint 4B
2. NO editar el survey
3. Login como ADMIN
4. Ir al panel de diagnostico

### Verificar

- [ ] Panel carga sin errores
- [ ] G2 muestra indicadores que SI existen
- [ ] Indicadores nuevos muestran "Dato no disponible" (no error)
- [ ] G4 humedad muestra "No especificada" (no error)
- [ ] Pasante AI funciona aunque falten datos nuevos

---

## TEST 18: Errores y Edge Cases

### API Errors

1. Desconectar internet
2. Intentar "Analizar" con Pasante AI

- [ ] Muestra mensaje de error claro
- [ ] Boton "Reintentar" visible
- [ ] No crashea la pagina

### Campos Vacios

1. Editar survey
2. Dejar ferritina vacia
3. Dejar humedad sin seleccionar
4. Guardar

- [ ] Survey guarda sin error
- [ ] Panel de diagnostico carga sin error

### Valores Limite

1. Ingresar ferritina = 0
2. Ingresar ferritina = 500

- [ ] Valores se guardan correctamente
- [ ] Panel interpreta correctamente (0 = bajo, 500 = normal)

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario/Padre | eljulius@nebulastudios.io | juls0925 |


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

*Generado el 2026-02-04 - Sprint 4A + 4B*
