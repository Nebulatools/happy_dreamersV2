# Requisitos Detallados para el Módulo de Registro de Eventos (Feedback Dra. Mariana)

La filosofía principal de la Dra. Mariana para el registro de eventos es la **simplicidad para los padres y la riqueza de datos para el análisis profesional**. El objetivo es facilitar la captura constante de información sin que sea una carga, pero obteniendo los detalles cruciales para el diagnóstico.

---

### 1. Estructura y Tipos de Eventos Propuestos

Se propone reestructurar los tipos de eventos para que sean más intuitivos y se centren en las acciones diarias más importantes.

**Eventos Primarios (de uso diario y constante):**
1.  **Dormir / Despertar:** Unificar todo el ciclo de sueño en estas dos acciones.
2.  **Alimentación (Tomas y Sólidos):** Sacarlo de "Actividades Extra" y convertirlo en un botón principal, ya que es un pilar del análisis, especialmente en menores de 1.5 años.

**Eventos Secundarios (contextuales y menos frecuentes):**
1.  **Medicamentos:** Dejarlo como una opción separada para registrar cuándo y qué se administró.
2.  **Actividades Extra:** Mantenerlo para registrar eventos no recurrentes que impactan el sueño (ej. una fiesta, una visita, una caída, etc.).

---

### 2. Detalles Específicos por Cada Tipo de Evento

Aquí se desglosa exactamente qué información debe capturar cada evento:

#### A. Evento "Dormir" / "Despertar" (El más importante)
* **Lógica de Ciclo**: En lugar de múltiples botones, el flujo debe ser un ciclo simple. El padre presiona **"Se durmió"** para iniciar un período de sueño y **"Se despertó"** para terminarlo. La plataforma debe calcular la duración total y, basándose en la hora del día, clasificarlo automáticamente como **"Sueño Nocturno"** o **"Siesta"**.
* **Campos al Registrar "Dormir":**
    -   **Hora de Inicio**: La hora en que el niño se durmió.
    -   **"¿Cuánto tardó en dormirse?"**: Un campo crucial. Opciones predefinidas (5 min, 10 min, 15 min, etc.) para medir la latencia del sueño.
    -   **Estado Emocional**: Las opciones "Tranquilo", "Inquieto", "Alterado" son correctas, ya que indican cómo fue la transición al sueño.
    -   **Notas (Campo Guiado)**: Este campo es vital para el contexto. Mariana sugiere que no sea un campo vacío, sino que tenga un texto guía (placeholder) como: *“Añade detalles sobre cómo se durmió. ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto? ¿Hubo alguna dificultad?”*

#### B. Evento "Despertar Nocturno" (un evento dentro del ciclo de sueño principal)
* Este no es un botón principal, sino una acción que ocurre *dentro* de un período de "Sueño Nocturno".
* **Campos al Registrar un Despertar Nocturno:**
    -   **Hora del Despertar**: La hora exacta en que se despertó.
    -   **"¿Cuánto tiempo tardó en volver a dormirse?"**: El dato más importante de este evento. Permite diferenciar un micro-despertar de un problema de insomnio medio.
    -   **Notas (Campo Guiado)**: El texto guía debería ser: *“¿Qué pasó durante el despertar? ¿Lloró mucho? ¿Necesitó consuelo? ¿Qué ayudó a calmarlo?”*

#### C. Evento "Alimentación"
* Debe ser un botón principal en el calendario.
* **Subtipos de Alimentación**: Debería permitir diferenciar entre:
    1.  **Tomas de Leche** (Pecho o Biberón).
    2.  **Alimentos Sólidos** (Desayuno, Comida, Cena, Snack).
* **Campo CRÍTICO para Tomas Nocturnas**: Para las tomas de leche que ocurren durante la noche, es indispensable una opción que pregunte: **"¿El bebé estaba dormido o despierto durante la toma?"**. La doctora enfatizó que un "dream feed" (toma dormido) es una técnica planificada, mientras que una toma donde el bebé se despierta completamente para comer es un indicador de un problema a resolver.

#### D. Evento "Medicamentos" y "Actividades Extra"
* **Medicamentos**: Un registro simple que pida el nombre del medicamento, la hora de administración y una nota opcional.
* **Actividades Extra**: Mantenerlo como está para eventos atípicos (visitas, enfermedades, viajes). La función de **grabar audio y transcribir** es muy valorada aquí, ya que los padres pueden explicar con sus propias palabras un evento complejo.

---

### 3. Cómo se Utiliza y Visualiza esta Información (El "Porqué")

> El objetivo de esta estructura de datos es alimentar directamente las herramientas de análisis del profesional:
>
> * **Análisis de "Ventanas de Sueño"**: Al tener un ciclo claro de "dormir/despertar", la plataforma puede calcular automáticamente el **tiempo que el niño pasa despierto entre cada período de sueño**. Esta es una de las métricas más importantes que la doctora analiza para ajustar los horarios.
> * **Diagnóstico de Problemas Nocturnos**: La combinación de la **hora, duración y notas** de los despertares nocturnos le permite a ella diagnosticar la causa raíz. Por ejemplo, despertares largos al inicio de la noche pueden indicar síndrome de piernas inquietas, mientras que despertares en la madrugada pueden estar ligados a hambre.
> * **Visualización en el Calendario**: En las vistas diaria y semanal, estos eventos deben aparecer como bloques de colores distintos, permitiendo ver de un solo vistazo el ritmo del día del niño: bloque de sueño, ventana de despierto (con eventos de alimentación dentro), bloque de siesta, etc. Esto crea un mapa visual del día que es fácil y rápido de interpretar.