# Análisis Completo de Campos de la Encuesta vs Modelo de Datos

## RESUMEN EJECUTIVO
Este documento identifica TODOS los campos que se capturan en la encuesta pero que NO están en el modelo de TypeScript (types/models.ts), lo que significa que NO se están guardando en MongoDB.

---

## 1. INFORMACIÓN FAMILIAR (informacionFamiliar)

### Campos capturados en FamilyInfoStep:
- Datos de Mamá y Papá se capturan correctamente

### ⚠️ PROBLEMA: No se capturó la lista completa de campos de FamilyInfoStep
Necesito revisar el archivo completo para ver todos los campos de mama y papa.

---

## 2. DINÁMICA FAMILIAR (dinamicaFamiliar)

### Campos en el COMPONENTE (FamilyDynamicsStep):
1. `comoSupiste` - ¿Cómo supiste de mis servicios?
2. `contactoPrincipal` - Contacto principal (mama/papa)
3. `librosConsultados` - Libros sobre sueño infantil
4. `metodosContra` - Métodos en contra
5. `otroAsesor` - ¿Has contratado otro asesor? (boolean)
6. `otroAsesorDetalle` - Detalles del otro asesor
7. `otrosResidentes` - Quiénes más viven en casa
8. `quienAtiende` - Quién atiende en la noche

### Campos en el MODELO (types/models.ts):
```typescript
dinamicaFamiliar: {
    cantidadHijos?: number
    hijosInfo?: Array<...>
    otrosEnCasa: string
    telefonoSeguimiento: string
    emailObservaciones: string
    comoConocioServicios: string
    librosConsultados?: string
    metodosEnContra?: string
    asesorAnterior?: string
    quienSeLevaantaNoche: string  // TYPO: debería ser quienSelevantaNoche
}
```

### ❌ CAMPOS FALTANTES EN EL MODELO:
1. **`contactoPrincipal`** (string: "mama" | "papa") - NO EXISTE
2. **`otroAsesor`** (boolean) - NO EXISTE (solo existe asesorAnterior que es string)
3. **`otroAsesorDetalle`** (string) - NO EXISTE

### ❌ PROBLEMAS DE NOMBRES INCONSISTENTES:
- Componente: `comoSupiste` → Modelo: `comoConocioServicios` ✓ (puede ser mapping)
- Componente: `otrosResidentes` → Modelo: `otrosEnCasa` ✓ (puede ser mapping)
- Componente: `quienAtiende` → Modelo: `quienSeLevaantaNoche` (TYPO en modelo) ✓
- Componente: `metodosContra` → Modelo: `metodosEnContra` ✓

---

## 3. HISTORIAL DEL NIÑO (historial)

### Campos en el COMPONENTE (ChildHistoryStep):
1. `complicacionesParto` (boolean)
2. `condicionesEmbarazo` (array)
3. `condicionesEmbarazoOtro` (string)
4. `embarazoPlaneado` (boolean)
5. `fechaNacimiento` (string)
6. `genero` (string)
7. `nacioTermino` (boolean)
8. `nombreHijo` (string)
9. `pediatra` (string)
10. `pediatraConfirma` (boolean)
11. `pediatraConfirmaDetalle` (string)
12. `pediatraDescarto` (boolean)
13. `pediatraEmail` (string)
14. `pediatraTelefono` (string)
15. `percentilPeso` (number)
16. `pesoHijo` (number)
17. `problemasEmbarazo` (boolean)
18. `problemasEmbarazoDetalle` (string)
19. `problemasHijo` (boolean)
20. `problemasNacer` (boolean)
21. `problemasNacerDetalle` (string)
22. `semanasNacimiento` (number)
23. `tipoParto` (string)
24. `tratamientoMedico` (boolean)
25. `tratamientoMedicoDetalle` (string)

### Campos en el MODELO (types/models.ts):
```typescript
historial: {
    nombre: string
    fechaNacimiento: string
    peso: number
    percentilPeso?: number
    embarazoPlaneado: boolean
    problemasEmbarazo: boolean
    problemasEmbarazoDescripcion?: string
    padecimientosEmbarazo: string[]
    tipoParto: "Vaginal" | "Cesárea" | "Vaginal después de Cesárea"
    complicacionesParto: boolean
    complicacionesPartoDescripcion?: string
    nacioPlazo: boolean
    problemasAlNacer: boolean
    problemasAlNacerDescripcion?: string
    pediatra?: string
    pediatraDescartaProblemas: boolean
    pediatraConfirmaCapacidadDormir: boolean
    tratamientoMedico: boolean
    tratamientoMedicoDescripcion?: string
}
```

### ❌ CAMPOS FALTANTES EN EL MODELO:
1. **`genero`** (string) - NO EXISTE
2. **`semanasNacimiento`** (number) - NO EXISTE
3. **`pediatraEmail`** (string) - NO EXISTE
4. **`pediatraTelefono`** (string) - NO EXISTE
5. **`pediatraConfirmaDetalle`** (string) - NO EXISTE
6. **`condicionesEmbarazoOtro`** (string) - NO EXISTE

### ❌ PROBLEMAS DE NOMBRES INCONSISTENTES:
- Componente: `nombreHijo` → Modelo: `nombre` ✓
- Componente: `pesoHijo` → Modelo: `peso` ✓
- Componente: `nacioTermino` → Modelo: `nacioPlazo` ✓
- Componente: `problemasHijo` → podría ser `problemasAlNacer`?
- Componente: `condicionesEmbarazo` → Modelo: `padecimientosEmbarazo` ✓
- Componente: `problemasEmbarazoDetalle` → Modelo: `problemasEmbarazoDescripcion` ✓
- Componente: `problemasNacer/problemasNacerDetalle` → Modelo: `problemasAlNacer/problemasAlNacerDescripcion` ✓
- Componente: `pediatraDescarto` → Modelo: `pediatraDescartaProblemas` ✓
- Componente: `pediatraConfirma` → Modelo: `pediatraConfirmaCapacidadDormir` ✓
- Componente: `tratamientoMedicoDetalle` → Modelo: `tratamientoMedicoDescripcion` ✓

---

## 4. DESARROLLO Y SALUD (desarrolloSalud)

### Campos en el COMPONENTE (HealthDevStep):
1. `alergiaAlimenticiaDetalle` (string)
2. `alergiaAmbientalDetalle` (string)
3. `alimentacion` (string)
4. `alimentacionOtro` (string)
5. `caminarMeses` (number)
6. `comeSolidos` (boolean)
7. `dificultadRespirarDetalle` (string)
8. `gatearMeses` (number)
9. `hijoUtiliza` (array) - Características del hijo
10. `infeccionesOidoDetalle` (string)
11. `nombreObjetoSeguridad` (string)
12. `pararseMeses` (number)
13. `planDejarDedo` (string)
14. `problemasHijo` (array) - Situaciones/problemas
15. `rodarMeses` (number)
16. `sentarseMeses` (number)
17. `situacionesHijo` (array)

### Campos en el MODELO (types/models.ts):
```typescript
desarrolloSalud: {
    edadRodar?: number
    edadSentarse?: number
    edadGatear?: number
    edadPararse?: number
    edadCaminar?: number
    usoVaso?: "Vaso" | "Biberón"
    alimentacion?: "Fórmula" | "Leche materna exclusiva" | "Leche materna y fórmula" | "Ninguna"
    comeSolidos?: boolean
    caracteristicas: string[]
}
```

### ❌ CAMPOS FALTANTES EN EL MODELO:
1. **`alergiaAlimenticiaDetalle`** (string) - NO EXISTE
2. **`alergiaAmbientalDetalle`** (string) - NO EXISTE
3. **`alimentacionOtro`** (string) - NO EXISTE
4. **`dificultadRespirarDetalle`** (string) - NO EXISTE
5. **`infeccionesOidoDetalle`** (string) - NO EXISTE
6. **`nombreObjetoSeguridad`** (string) - NO EXISTE
7. **`planDejarDedo`** (string) - NO EXISTE
8. **`problemasHijo`** (array) - NO EXISTE
9. **`situacionesHijo`** (array) - NO EXISTE
10. **`usoVaso`** - NO se captura en el componente

### ❌ PROBLEMAS DE NOMBRES INCONSISTENTES:
- Componente: `rodarMeses` → Modelo: `edadRodar` ✓
- Componente: `sentarseMeses` → Modelo: `edadSentarse` ✓
- Componente: `gatearMeses` → Modelo: `edadGatear` ✓
- Componente: `pararseMeses` → Modelo: `edadPararse` ✓
- Componente: `caminarMeses` → Modelo: `edadCaminar` ✓
- Componente: `hijoUtiliza` → Modelo: `caracteristicas` ✓

---

## 5. ACTIVIDAD FÍSICA (actividadFisica)

### Campos en el COMPONENTE (PhysicalActivityStep):
1. `actividadesDespierto` (string)
2. `actividadesLista` (string)
3. `irritabilidadDetalle` (string)
4. `pantallasDetalle` (string)
5. `practicaActividad` (boolean)
6. `signosIrritabilidad` (boolean)
7. `vePantallas` (boolean)

### Campos en el MODELO (types/models.ts):
```typescript
actividadFisica: {
    vePantallas: boolean
    pantallasTiempo?: string
    practicaActividad: boolean
    actividades?: string
    actividadesDespierto?: string
    signosIrritabilidad: boolean
    situacionesSufridas?: string[]
}
```

### ❌ CAMPOS FALTANTES EN EL MODELO:
1. **`actividadesLista`** (string) - NO EXISTE
2. **`irritabilidadDetalle`** (string) - NO EXISTE (cuando `signosIrritabilidad` es true)
3. **`pantallasDetalle`** (string) - NO EXISTE (cuando `vePantallas` es true)

### ❌ PROBLEMAS DE NOMBRES INCONSISTENTES:
- Componente: `actividadesLista` → podría ser Modelo: `actividades`?

---

## 6. RUTINA Y HÁBITOS (rutinaHabitos)

### Campos en el COMPONENTE (RoutineHabitsStep):
1. `colorLamparita` ⭐ (string)
2. `comparteHabitacion` (boolean)
3. `comparteHabitacionCon` (string)
4. `desdeCuandoDespierta` (string)
5. `desdeCuandoProblema` (string)
6. `despiertaNoche` (boolean)
7. `diaTipico` (string)
8. `dondeDuerme` (string)
9. `dondeDuermeSalida` (string)
10. `dondeSiestas` (string)
11. `duermeSolo` (boolean)
12. `duracionTotalSiestas` (string)
13. `horaAcostarBebe` (string)
14. `horaDespertar` (string)
15. `horaDormir` (string)
16. `infoAdicional` (string)
17. `kinderDetalle` (string)
18. `numeroSiestas` (number)
19. `objetivoPadres` (string)
20. `oscuridadCuarto` (string)
21. `principalPreocupacion` (string)
22. `queHacesDespierta` (string)
23. `quienCuida` (string)
24. `quienCuidaNoche` (string)
25. `ruidoBlanco` (boolean)
26. `rutinaDormir` (string)
27. `teQuedasHastaDuerma` (boolean)
28. `temperaturaCuarto` (string)
29. `tiempoDespierto` (string)
30. `tiempoDormir` (string)
31. `tipoPiyama` (string)
32. `tomaSiestas` (boolean)
33. `usaSaco` (boolean)
34. `vaKinder` (boolean)
35. `vecesDespierta` (number)

### Campos en el MODELO (types/models.ts):
```typescript
rutinaHabitos: {
    diaTypico: string
    vaGuarderia: boolean
    quienPasaTiempo: string
    quienCuidaNoche?: string
    dondeVurmePadresSalen?: string    // TYPO
    rutinaAntesAcostarse: string
    horaEspecificaDormir: boolean
    horaDormir?: string
    seQuedaDormirSolo: boolean
    oscuridadCuarto: string[]         // ❌ DEBERÍA SER string NO array
    usaRuidoBlanco: boolean
    temperaturaCuarto?: string
    tipoPiyama: string
    usaSacoDormir: boolean
    seQuedaHastaConciliar: boolean

    dondeDuermeNoche: string (enum)
    comparteHabitacion: boolean
    conQuienComparte?: string
    intentaSalirCama: boolean
    sacaDesCamaNohe: boolean
    lloraAlDejarSolo: boolean
    golpeaCabeza: boolean
    despiertaEnNoche: boolean
    miendoOscuridad: boolean
    padresMiedoOscuridad: boolean
    temperamento: string
    reaccionDejarSolo: string
    metodosRelajarse: string
    haceSiestas: boolean

    otrosHijosProblemas?: boolean
    dondeViermesViaja?: string        // TYPO
    duermeMejorViaja?: string
    padresDispuestos: boolean
    objetivosPadres: string
    informacionAdicional?: string
}
```

### ❌ CAMPOS FALTANTES EN EL MODELO (CRÍTICOS):
1. **`colorLamparita`** ⭐⭐⭐ (string) - NO EXISTE - ¡EL EJEMPLO QUE MENCIONASTE!
2. **`horaAcostarBebe`** (string) - NO EXISTE
3. **`horaDespertar`** (string) - NO EXISTE
4. **`tiempoDormir`** (string/number) - NO EXISTE
5. **`numeroSiestas`** (number) - NO EXISTE
6. **`duracionTotalSiestas`** (string) - NO EXISTE
7. **`dondeSiestas`** (string) - NO EXISTE
8. **`vecesDespierta`** (number) - NO EXISTE
9. **`desdeCuandoDespierta`** (string) - NO EXISTE
10. **`desdeCuandoProblema`** (string) - NO EXISTE
11. **`tiempoDespierto`** (string) - NO EXISTE
12. **`queHacesDespierta`** (string) - NO EXISTE
13. **`kinderDetalle`** (string) - NO EXISTE
14. **`principalPreocupacion`** (string) - NO EXISTE

### ❌ PROBLEMAS DE NOMBRES/TIPOS INCONSISTENTES:
- Componente: `diaTipico` → Modelo: `diaTypico` (typo en modelo)
- Componente: `vaKinder` → Modelo: `vaGuarderia` ✓
- Componente: `quienCuida` → Modelo: `quienPasaTiempo` ✓
- Componente: `dondeDuermeSalida` → Modelo: `dondeVurmePadresSalen` (TYPO grave)
- Componente: `rutinaDormir` → Modelo: `rutinaAntesAcostarse` ✓
- Componente: `duermeSolo` → Modelo: `seQuedaDormirSolo` ✓
- Componente: `oscuridadCuarto` (string) → Modelo: `oscuridadCuarto` (string[]) ❌ TIPO INCORRECTO
- Componente: `ruidoBlanco` → Modelo: `usaRuidoBlanco` ✓
- Componente: `usaSaco` → Modelo: `usaSacoDormir` ✓
- Componente: `teQuedasHastaDuerma` → Modelo: `seQuedaHastaConciliar` ✓
- Componente: `dondeDuerme` → Modelo: `dondeDuermeNoche` ✓
- Componente: `comparteHabitacionCon` → Modelo: `conQuienComparte` ✓
- Componente: `despiertaNoche` → Modelo: `despiertaEnNoche` ✓
- Componente: `tomaSiestas` → Modelo: `haceSiestas` ✓
- Componente: `objetivoPadres` → Modelo: `objetivosPadres` ✓
- Componente: `infoAdicional` → Modelo: `informacionAdicional` ✓

---

## RESUMEN DE PROBLEMAS CRÍTICOS

### ⚠️ TOTAL DE CAMPOS FALTANTES: ~45+ campos

### Campos condicionales más importantes que NO se guardan:
1. **`colorLamparita`** - Color de la lámpara cuando oscuridadCuarto = "lamparita"
2. **`pediatraEmail`** y **`pediatraTelefono`** - Contacto del pediatra
3. **`pediatraConfirmaDetalle`** - Detalles de confirmación del pediatra
4. **`alergiaAlimenticiaDetalle`** - Detalles de alergias alimenticias
5. **`alergiaAmbientalDetalle`** - Detalles de alergias ambientales
6. **`irritabilidadDetalle`** - Detalles de irritabilidad
7. **`pantallasDetalle`** - Detalles de uso de pantallas
8. **`otroAsesorDetalle`** - Detalles de otro asesor

### Tipos de datos incorrectos:
1. **`oscuridadCuarto`** - Modelo: `string[]` pero debería ser `string`

### Typos en el modelo:
1. `quienSeLevaantaNoche` → debería ser `quienSeLevantaNoche`
2. `dondeVurmePadresSalen` → debería ser `dondeDuermePadresSalen`
3. `dondeViermesViaja` → debería ser `dondeDuermeViaja`
4. `diaTypico` → debería ser `diaTipico`

---

## ACCIÓN REQUERIDA

Se necesita actualizar el archivo `types/models.ts` para agregar TODOS los campos faltantes y corregir los tipos/nombres incorrectos para asegurar que TODA la información de la encuesta se guarde en MongoDB.

