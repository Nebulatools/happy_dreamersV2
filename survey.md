# Encuesta completa - Happy Dreamers

Esta documentación recoge todas las preguntas y componentes de la encuesta utilizada en la aplicación Happy Dreamers para la evaluación de pacientes pediátricos con problemas de sueño, indicando el tipo de campo y sus posibles valores.

## Estructura de la encuesta

La encuesta está dividida en varios formularios, cada uno enfocado en un aspecto específico de la información del niño y su familia:

1. **Información de los Padres** (`ParentInfoForm`, `MotherForm`, `FatherForm`)
2. **Historia del Niño** (`ChildHistoryForm`)
3. **Dinámica Familiar** (`FamilyDynamicsForm`, `SiblingsForm`)
4. **Información Prenatal** (`PrenatalInfoForm`)
5. **Actividad Física** (`PhysicalActivityForm`)
6. **Desarrollo y Salud** (`DevelopmentHealthForm`)
7. **Rutinas de Sueño** (`SleepRoutineForm`)

Todos los formularios utilizan la tabla `survey_answers` de Supabase para almacenar las respuestas, con cada formulario vinculado a un ID de encuesta específico.

## IDs de Encuesta

- **Información de Padres, Historia del Niño, Actividad Física, Rutinas de Sueño**: `'c5aa9feb-3a8e-4d48-af5f-e1d3554457b4'`
- **Dinámica Familiar**: `'a1e40250-f346-4e11-9f5c-ca8ad09c9035'`
- **Desarrollo y Salud**: `'b8ccf23b-37ba-4f0e-a901-08cfb5b37ab5'`

## Detalle de los Formularios

### 1. Información de los Padres

#### Madre (`MotherForm`)
- **Campos:**
  - `mother_name`: 
    - Tipo: Input text
    - Descripción: Nombre de la madre
    - Validación: Mínimo 2 caracteres si es requerido
  - `mother_age`: 
    - Tipo: Input number
    - Descripción: Edad de la madre
  - `mother_occupation`: 
    - Tipo: Input text
    - Descripción: Ocupación de la madre
  - `mother_same_address`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Misma dirección que el niño?
    - Valores: "yes", "no"
  - `mother_city`: 
    - Tipo: Input text
    - Descripción: Ciudad de residencia
  - `mother_phone`: 
    - Tipo: Input text
    - Descripción: Teléfono de contacto
  - `mother_email`: 
    - Tipo: Input email
    - Descripción: Correo electrónico
  - `mother_works_outside`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Trabaja fuera de casa?
    - Valores: "yes", "no"
  - `mother_can_sleep`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Puede dormir correctamente?
    - Valores: "yes", "no"
  - `mother_appetite`: 
    - Tipo: Textarea
    - Descripción: Apetito
  - `mother_negative_thoughts`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Pensamientos negativos?
    - Valores: "yes", "no"
  - `mother_allergies`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Alergias?
    - Valores: "yes", "no"

#### Padre (`FatherForm`)
- **Campos:**
  - `father_name`: 
    - Tipo: Input text
    - Descripción: Nombre del padre
    - Validación: Mínimo 2 caracteres si es requerido
  - `father_age`: 
    - Tipo: Input number
    - Descripción: Edad del padre
  - `father_occupation`: 
    - Tipo: Input text
    - Descripción: Ocupación del padre
  - `father_address`: 
    - Tipo: Input text
    - Descripción: Dirección del padre
  - `father_city`: 
    - Tipo: Input text
    - Descripción: Ciudad de residencia
  - `father_phone`: 
    - Tipo: Input text
    - Descripción: Teléfono de contacto
  - `father_email`: 
    - Tipo: Input email
    - Descripción: Correo electrónico
  - `father_works_outside`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Trabaja fuera de casa?
    - Valores: "yes", "no"
  - `father_allergies`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Alergias?
    - Valores: "yes", "no"

#### Información General (`ParentInfoForm`)
- **Campos:**
  - `referral_source`: 
    - Tipo: Input text
    - Descripción: ¿Cómo se enteró de nosotros?

### 2. Dinámica Familiar (`FamilyDynamicsForm`)

- **Campos:**
  - `siblings`: 
    - Tipo: Componente personalizado (SiblingsForm)
    - Descripción: Lista de hermanos
    - Estructura: Array de objetos con propiedades:
      - `id`: ID generado automáticamente
      - `first_name`: Nombre (input text)
      - `last_name`: Apellido (input text)
      - `date_of_birth`: Fecha de nacimiento (input date)
  - `primary_caregiver`: 
    - Tipo: Select
    - Descripción: Cuidador principal
    - Valores:
      ```
      [
        { id: "mother", label: "Madre" },
        { id: "father", label: "Padre" },
        { id: "both", label: "Ambos padres" },
        { id: "grandparent", label: "Abuelo(a)" },
        { id: "other_relative", label: "Otro familiar" },
        { id: "nanny", label: "Niñera" },
        { id: "other", label: "Otro" }
      ]
      ```
  - `night_caregiver`: 
    - Tipo: Select
    - Descripción: Cuidador durante la noche
    - Valores: Igual que `primary_caregiver`
  - `night_wakings_caregiver`: 
    - Tipo: Select
    - Descripción: Cuidador para despertares nocturnos
    - Valores: Igual que `primary_caregiver`
  - `other_household_members`: 
    - Tipo: Textarea
    - Descripción: Otros miembros del hogar
  - `parent_participation`: 
    - Tipo: Select (Sí/No)
    - Descripción: Participación de ambos padres
    - Valores: "yes", "no"
  - `separation_anxiety`: 
    - Tipo: Select (Sí/No)
    - Descripción: Ansiedad por separación
    - Valores: "yes", "no"
  - `alone_reaction`: 
    - Tipo: Select (Sí/No)
    - Descripción: Reacción al estar solo
    - Valores: "yes", "no"
  - `parent_dark_fear`: 
    - Tipo: Select (Sí/No)
    - Descripción: Miedo a la oscuridad de los padres
    - Valores: "yes", "no"

### 3. Historia del Niño (`ChildHistoryForm`)

- **Campos:**
  - `child_name`: 
    - Tipo: Input text
    - Descripción: Nombre del niño
    - Requerido: Sí
    - Validación: Mínimo 2 caracteres
  - `child_last_name`: 
    - Tipo: Input text
    - Descripción: Apellido del niño
    - Requerido: Sí
    - Validación: Mínimo 2 caracteres
  - `birth_date`: 
    - Tipo: Input date
    - Descripción: Fecha de nacimiento
    - Requerido: Sí
  - `weight`: 
    - Tipo: Input number
    - Descripción: Peso (en kg)
  - `weight_percentile`: 
    - Tipo: Input number
    - Descripción: Percentil de peso
  - `full_term`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Nacimiento a término?
    - Valores: "yes", "no"
  - `birth_problems`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Problemas al nacer?
    - Valores: "yes", "no"
  - `child_temperament`: 
    - Tipo: Input text
    - Descripción: Temperamento del niño
  - `daycare`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Asiste a guardería?
    - Valores: "yes", "no"
  - `feeding_type`: 
    - Tipo: Select
    - Descripción: Tipo de alimentación
    - Valores:
      ```
      [
        { id: "formula", label: "Fórmula" },
        { id: "leche_materna", label: "Leche Materna Exclusiva" },
        { id: "leche_formula", label: "Leche y Fórmula" },
        { id: "ninguna", label: "Ninguna" }
      ]
      ```
  - `eats_solids`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Come sólidos?
    - Valores: "yes", "no"
  - `uses_cup`: 
    - Tipo: Checkbox múltiple
    - Descripción: Uso de vaso/biberón
    - Valores:
      ```
      [
        { id: "cup", label: "Vaso" },
        { id: "biberon", label: "Biberón" },
        { id: "ninguno", label: "Nada" }
      ]
      ```
  - `additional_info`: 
    - Tipo: Textarea
    - Descripción: Información adicional

### 4. Actividad Física (`PhysicalActivityForm`)

- **Campos:**
  - `screen_time`: 
    - Tipo: Select (Sí/No)
    - Descripción: Tiempo frente a pantallas
    - Valores: "yes", "no"
  - `physical_activity`: 
    - Tipo: Input text
    - Descripción: Actividad física
  - `awake_activities`: 
    - Tipo: Textarea
    - Descripción: Actividades durante tiempo despierto
  - `irritability`: 
    - Tipo: Select (Sí/No)
    - Descripción: Irritabilidad
    - Valores: "yes", "no"
  - `health_conditions`: 
    - Tipo: Checkbox múltiple
    - Descripción: Condiciones de salud
    - Valores:
      ```
      [
        { id: "allergies", label: "Alergias" },
        { id: "ear_infections", label: "Infecciones de oído frecuentes" },
        { id: "asthma", label: "Asma" },
        { id: "rhinitis", label: "Rinitis" },
        { id: "stuffy_nose", label: "Frecuente nariz tapada" },
        { id: "dermatitis", label: "Dermatitis atópica" }
      ]
      ```

### 5. Información Prenatal (`PrenatalInfoForm`)

- **Campos:**
  - `planned_pregnancy`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Embarazo planeado?
    - Valores: "yes", "no"
  - `pregnancy_issues`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Problemas durante el embarazo?
    - Valores: "yes", "no"
  - `pregnancy_conditions`: 
    - Tipo: Checkbox múltiple
    - Descripción: Condiciones durante el embarazo
    - Valores:
      ```
      [
        { id: "anemia", label: "Anemia" },
        { id: "infections", label: "Infecciones" },
        { id: "none", label: "Ninguna" }
      ]
      ```
  - `birth_type`: 
    - Tipo: Select
    - Descripción: Tipo de parto
    - Valores:
      ```
      [
        { id: "vaginal", label: "Vaginal" },
        { id: "cesarea", label: "Cesárea" },
        { id: "vaginal_post_cesarea", label: "Vaginal después de Cesárea" }
      ]
      ```
  - `birth_complications`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Complicaciones durante el parto?
    - Valores: "yes", "no"
  - `full_term`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Nacimiento a término?
    - Valores: "yes", "no"

### 6. Desarrollo y Salud (`DevelopmentHealthForm`)

- **Campos:**
  - `birth_weeks`: 
    - Tipo: Input number
    - Descripción: Semanas de gestación al nacer
  - `birth_complications`: 
    - Tipo: Input text
    - Descripción: Complicaciones durante el nacimiento
  - `health_issues`: 
    - Tipo: Input text
    - Descripción: Problemas de salud
  - `medications`: 
    - Tipo: Input text
    - Descripción: Medicamentos actuales
  - `disabilities`: 
    - Tipo: Input text
    - Descripción: Discapacidades
  - `speech_development`: 
    - Tipo: Input text
    - Descripción: Desarrollo del habla
  - `crawl_age`: 
    - Tipo: Input number
    - Descripción: Edad a la que gateó (meses)
  - `walk_age`: 
    - Tipo: Input number
    - Descripción: Edad a la que caminó (meses)
  - `first_words_age`: 
    - Tipo: Input number
    - Descripción: Edad de las primeras palabras (meses)
  - `growth_concerns`: 
    - Tipo: Input text
    - Descripción: Preocupaciones sobre el crecimiento
  - `drinks_bottle`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Usa biberón?
    - Valores: "yes", "no"
  - `drinks_bottle_night`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Usa biberón durante la noche?
    - Valores: "yes", "no"
  - `eats_solids`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Come alimentos sólidos?
    - Valores: "yes", "no"
  - `rolling_date`: 
    - Tipo: Input date
    - Descripción: Fecha en que comenzó a rodar
  - `sitting_date`: 
    - Tipo: Input date
    - Descripción: Fecha en que comenzó a sentarse
  - `crawling_date`: 
    - Tipo: Input date
    - Descripción: Fecha en que comenzó a gatear
  - `standing_date`: 
    - Tipo: Input date
    - Descripción: Fecha en que comenzó a pararse
  - `walking_date`: 
    - Tipo: Input date
    - Descripción: Fecha en que comenzó a caminar
  - `development_issues`: 
    - Tipo: Checkbox múltiple
    - Descripción: Problemas de desarrollo
    - Valores:
      ```
      [
        { id: "thumb_sucking", label: "Se chupa el dedo" },
        { id: "pacifier", label: "Usa chupón" },
        { id: "security_object", label: "Objeto de seguridad: Trapito o Peluche" },
        { id: "medical_issues", label: "Tiene o ha tenido problemas médicos o del desarrollo" },
        { id: "bedwetting", label: "Moja la cama durante la noche" },
        { id: "sleepwalking", label: "Es sonámbulo" },
        { id: "snoring", label: "Ronca" },
        { id: "mouth_breathing", label: "Respira por la boca" },
        { id: "falling", label: "Se cae de la cama con frecuencia" },
        { id: "restless", label: "Es muy inquieto para dormir" },
        { id: "sweating", label: "Transpira mucho cuando duerme" },
        { id: "reflux", label: "Tiene o ha tenido reflujo y/o cólicos" },
        { id: "nightmares", label: "Tiene o ha tenido pesadillas" }
      ]
      ```

### 7. Rutinas de Sueño (`SleepRoutineForm`)

- **Campos:**
  - `daily_routine`: 
    - Tipo: Textarea
    - Descripción: Rutina diaria
  - `daycare`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Asiste a guardería?
    - Valores: "yes", "no"
  - `primary_caregiver`: 
    - Tipo: Select
    - Descripción: Cuidador principal
    - Valores: Igual que en Dinámica Familiar
  - `night_caregiver`: 
    - Tipo: Select
    - Descripción: Cuidador durante la noche
    - Valores: Igual que en Dinámica Familiar
  - `night_sleep_location_when_out`: 
    - Tipo: Input text
    - Descripción: Ubicación para dormir cuando están fuera de casa
  - `room_darkness`: 
    - Tipo: Checkbox múltiple
    - Descripción: Oscuridad de la habitación
  - `white_noise`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Usa ruido blanco?
    - Valores: "yes", "no"
  - `room_temperature`: 
    - Tipo: Input number
    - Descripción: Temperatura de la habitación
  - `pajama_type`: 
    - Tipo: Input text
    - Descripción: Tipo de pijama
  - `sleep_sack`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Usa saco de dormir?
    - Valores: "yes", "no"
  - `bedtime_routine`: 
    - Tipo: Textarea
    - Descripción: Rutina antes de dormir
  - `bedtime`: 
    - Tipo: Input time
    - Descripción: Hora de acostarse
  - `self_soothing`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Se calma solo?
    - Valores: "yes", "no"
  - `parent_present`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Padre presente hasta que se duerme?
    - Valores: "yes", "no"
  - `sleep_location`: 
    - Tipo: Checkbox múltiple
    - Descripción: Ubicación para dormir
    - Valores:
      ```
      [
        { id: "cama_cuarto", label: "Cama en su cuarto" },
        { id: "cama_cuartoPadres", label: "Cama en su cuarto con alguno de los padres" },
        { id: "cuna_cuarto", label: "Cuna/corral en su cuarto" },
        { id: "cuna_papas", label: "Cuna/corral en cuarto de papás" },
        { id: "cama_papas", label: "Cama de papás" },
        { id: "cuna_camaPadres", label: "Primero en su cuna/corral y luego a cama de papás" },
        { id: "cama_camaPadres", label: "Primero en su cama y luego a cama de papás" }
      ]
      ```
  - `room_sharing`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Comparte habitación?
    - Valores: "yes", "no"
  - `crib_escape`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Se escapa de la cuna?
    - Valores: "yes", "no"
  - `night_moving`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Se mueve durante la noche?
    - Valores: "yes", "no"
  - `separation_anxiety`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Ansiedad por separación?
    - Valores: "yes", "no"
  - `body_rocking`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Se balancea?
    - Valores: "yes", "no"
  - `night_wakings`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Despertares nocturnos?
    - Valores: "yes", "no"
  - `dark_fear`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Miedo a la oscuridad?
    - Valores: "yes", "no"
  - `parent_dark_fear`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Padres con miedo a la oscuridad?
    - Valores: "yes", "no"
  - `child_temperament`: 
    - Tipo: Input text
    - Descripción: Temperamento del niño
  - `alone_reaction`: 
    - Tipo: Input text
    - Descripción: Reacción cuando está solo
  - `self_soothing_method`: 
    - Tipo: Input text
    - Descripción: Método para calmarse solo
  - `naps`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Toma siestas?
    - Valores: "yes", "no"
  - `siblings_sleep_issues`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Hermanos con problemas de sueño?
    - Valores: "yes", "no"
  - `travel_sleep_location`: 
    - Tipo: Input text
    - Descripción: Ubicación para dormir en viajes
  - `travel_sleep_quality`: 
    - Tipo: Select
    - Descripción: Calidad del sueño en viajes
  - `parent_participation`: 
    - Tipo: Select (Sí/No)
    - Descripción: ¿Participación de ambos padres?
    - Valores: "yes", "no"
  - `sleep_goals`: 
    - Tipo: Textarea
    - Descripción: Metas de sueño
  - `additional_info`: 
    - Tipo: Textarea
    - Descripción: Información adicional

## Estructura de Datos en Supabase

La aplicación utiliza principalmente estas tablas:

- `survey_questions`: Almacena las preguntas de cada encuesta (id, field_name, question_text, question_type, required, etc.)
- `survey_answers`: Guarda las respuestas de los usuarios (survey_id, question_id, answer_value, patient_id, created_by)
- `survey_children`: Contiene información sobre hermanos (id, first_name, last_name, date_of_birth, family, created_by)
- `patients`: Vincula las respuestas a un paciente específico (id, first_name, last_name, date_of_birth, parent_id, etc.)

Las respuestas se guardan con detección de cambios, almacenando solo los campos que han sido modificados para minimizar escrituras en la base de datos.

## Notas de Implementación

- Todos los formularios utilizan validación dinámica con Zod basada en las preguntas recuperadas de la base de datos.
- Los campos se pre-rellenan con respuestas existentes si están disponibles.
- Los formularios utilizan React Hook Form para la gestión del estado y la validación.
- Para evitar problemas de anidamiento de formularios HTML, se han modificado los componentes para que utilicen `<div>` en lugar de `<form>` cuando se utilizan como componentes secundarios.
- Cada formulario carga dinámicamente sus preguntas desde Supabase filtrando por el ID de encuesta correspondiente. 