# Documentación de Screens de Figma - Happy Dreamers

## Información General del Proyecto
- **Nombre del archivo**: Zuli (Happy Dreamers)
- **Última modificación**: 2025-07-21T18:49:26Z
- **Colores principales**:
  - Blanco: #FFFFFF
  - Azul primario: #2553A1, #4A90E2
  - Azul secundario: #67C5FF, #628BE6
  - Gradientes azules: #EAE8FE → #6AAAFA
  - Gris oscuro: #2F2F2F
  - Gris medio: #6B7280, #4D4E78
  - Colores de eventos: #7DBFE2 (sueño nocturno), #F5A623 (siesta), #FF9194 (despertar nocturno)

---

## Screen 1: Calendario de Sueño

### Estructura General
- **Layout principal**: 1440px de ancho con sidebar de 256px
- **Contenido principal**: 1184px de ancho con padding de 32px

### Sidebar
- **Fondo**: Gradiente vertical de #EAE8FE a #6AAAFA
- **Logo**: "Happy Dreamers" en la parte superior
- **Navegación**:
  - Dashboard (activo - destacado en azul)
  - Análisis de Sueño
  - Diario de Sueño
  - Consejos
  - Configuración
  - **Calendario (resaltado como sección actual)**

### Área Principal del Calendario

#### Header del Calendario
- **Título**: "Calendario de Sueño" (24px, peso 700)
- **Controles de navegación**:
  - Botones de navegación izquierda/derecha
  - Indicador de mes/año: "Mayo 2025"
  - **Botón "Registrar Evento"**: Gradiente azul (#628BE6 → #67C5FF) con ícono +

#### Controles de Vista
- **Botones de vista temporal**:
  - **Mensual** (activo - fondo azul)
  - Semanal (inactivo - borde gris)
  - Diario (inactivo - borde gris)

#### Leyenda de Tipos de Eventos
- **Sueño nocturno**: Círculo azul claro (#7DBFE2)
- **Siesta**: Círculo naranja (#F5A623) 
- **Despertar nocturno**: Círculo rojo/rosa (#FF9194)

#### Grilla del Calendario
- **Encabezados de días**: Lun, Mar, Mié, Jue, Vie, Sáb, Dom
- **Celdas de días**:
  - Días del mes anterior/siguiente: Texto gris (#9CA3AF)
  - Días del mes actual: Texto negro (#1F2937)
  - **Día actual (8)**: Fondo azul claro resaltado
  
#### Eventos en el Calendario
Cada día puede mostrar múltiples eventos con formato de pastillas coloreadas:
- **Sueño nocturno**: "21:00-7:30", "20:30-7:15", etc.
- **Siestas**: "14:00-15:30", "13:30-15:00", etc.
- **Despertares nocturnos**: "3:15", "2:45", "1:20", etc.

### Panel de Resumen Mensual
- **Título**: "Resumen del mes"
- **Métricas principales**:
  1. **Horas de sueño nocturno**: 10.5 horas
     - Indicador: ↑ 0.3 horas más que el mes pasado (verde)
  2. **Tiempo de siesta**: 1.5 horas  
     - Indicador: Sin cambios respecto al mes pasado
  3. **Despertares nocturnos**: 5
     - Indicador: ↓ 2 menos que el mes pasado (verde)

---

## Screen 2: Asistente de Chat (AI Chat)

### Estructura General
- **Layout**: Sidebar izquierdo + área principal de chat
- **Dimensiones**: 1440px total, sidebar 256px, chat 1184px

### Sidebar
- **Idéntico al calendario**: Misma navegación y diseño
- **Dashboard activo**: Resaltado en azul

### Header del Chat
- **Título**: "Asistente Happy Dreamers" (20px, peso 600)
- **Botones de acción**:
  - "Ayuda" (enlace azul)
  - "Contacto" (enlace azul)

### Área Principal del Chat

#### Card de Presentación del Asistente
- **Avatar**: Círculo azul con ícono de usuario
- **Título**: "Tu Coach de Sueño Virtual" (16px, peso 600)
- **Subtítulo**: "Disponible 24/7 para ayudarte" (12px)
- **Botones de acción**: Íconos de opciones de chat

#### Conversación de Chat

##### Mensaje del Asistente (Inicial)
- **Fondo**: Morado claro (#EDE5FF)
- **Avatar**: Círculo azul con ícono de bot
- **Contenido**: 
  ```
  ¡Hola! Soy el asistente de Happy Dreamers. Estoy aquí para ayudarte con 
  cualquier consulta sobre el sueño de tu hijo/a. ¿En qué puedo ayudarte hoy?
  ```

##### Mensaje del Usuario
- **Fondo**: Azul claro (#EBF4FF)
- **Alineación**: Derecha
- **Contenido**: 
  ```
  Mi hijo de 3 años se despierta varias veces durante la noche. 
  ¿Qué puedo hacer para ayudarlo a dormir mejor?
  ```

##### Respuesta Detallada del Asistente
- **Fondo**: Morado claro (#EDE5FF)
- **Estructura**:
  - Introducción empática
  - **Lista de sugerencias**:
    • Establecer una rutina constante antes de dormir
    • Crear un ambiente tranquilo y oscuro
    • Limitar la exposición a pantallas al menos 1 hora antes de acostarse
    • Asegurarse de que no tenga hambre o sed antes de dormir
  - Pregunta de seguimiento

##### Mensaje del Usuario (Seguimiento)
- **Contenido**: Solicitud de información específica sobre ambiente de sueño

##### Respuesta Avanzada del Asistente
- **Fondo**: Blanco (#FFFFFF)
- **Estructura detallada**:
  - **Temperatura y luz**:
    • Mantener habitación fresca (18-21°C)
    • Usar cortinas opacas o blackout
    • Considerar luz nocturna tenue si teme a la oscuridad
  - **Sonido**:
    • Utilizar ruido blanco o sonidos suaves constantes
    • Evitar ruidos repentinos o fuertes
  - **Comodidad**:
    • Asegurar colchón cómodo y adecuado
    • Usar ropa de cama suave y transpirable
    • Vestir al niño con ropa cómoda para dormir
  - **Enlace a recursos**: "guía completa sobre ambientes de sueño" (texto en azul #4A90E2)

### Panel de Sugerencias
- **Título**: "Sugerencias:" con ícono
- **Botones de temas rápidos**:
  - "Rutinas de sueño" (pastilla gris)
  - "Pesadillas" (pastilla gris)  
  - "Siestas" (pastilla gris)

### Input de Mensaje
- **Campo de texto**: "Message" como placeholder
- **Botones de acción**:
  - Adjuntar archivo (clip)
  - Micrófono (para grabación de voz)
  - Enviar (flecha hacia arriba en círculo azul)
- **Indicador de grabación**: Círculos concéntricos animados con ícono de micrófono

### Elementos de UI Comunes

#### Tipografía
- **Fuente principal**: Inter
- **Títulos grandes**: 24px, peso 700
- **Títulos medianos**: 20px, peso 600  
- **Títulos pequeños**: 16px, peso 500
- **Texto regular**: 16px, peso 400
- **Texto pequeño**: 12px, peso 400

#### Botones
- **Primarios**: Gradiente azul con texto blanco
- **Secundarios**: Fondo gris (#F3F4F6) con texto gris oscuro
- **Enlaces**: Texto azul (#2553A1 o #4A90E2)
- **Border radius**: 8px para elementos principales, 9999px para botones circulares

#### Shadows y Efectos
- **Cards principales**: box-shadow suave (0px 4px 6px rgba(0,0,0,0.1))
- **Elementos flotantes**: box-shadow más pronunciada
- **Border radius**: 12px para cards, 16px para elementos de chat

#### Estados Interactivos
- **Hover**: Cambios sutiles de color
- **Active**: Estados resaltados con fondos coloreados
- **Focus**: Bordes azules o cambios de sombra

### Notas Técnicas de Implementación

#### Layout responsivo
- Sidebar colapsable en pantallas pequeñas
- Grid system para el calendario
- Flexbox para elementos de chat

#### Funcionalidades del Calendario
- Navegación mensual/semanal/diaria
- Registro de eventos con modal
- Visualización de múltiples tipos de eventos
- Resumen estadístico automático

#### Funcionalidades del Chat
- Scroll automático a mensajes nuevos
- Grabación de audio
- Adjuntar archivos
- Sugerencias rápidas
- Enlaces a recursos adicionales

---

## Screen 3: Encuesta de Sueño Infantil

### Estructura General
- **Dimensiones**: 896px de ancho, altura variable según el contenido
- **Título Principal**: "Encuesta de Sueño Infantil" (Inter, 30px, peso 700, #2F2F2F)
- **Subtítulo**: "Ayúdanos a entender mejor los patrones de sueño de tu hijo/a para poder ofrecerte recomendaciones personalizadas." (Inter, 16px, #666666)

### Indicador de Progreso
- **Progreso actual**: "2 de 5 pasos" (Inter, 14px, peso 500)
- **Barra de progreso**: 
  - Fondo gris (#E5E5E5), altura 10px, bordes redondeados
  - Progreso en gradiente azul (#628BE6 a #67C5FF), 40% completado
  - Shadow: 0px 2px 4px rgba(0,0,0,0.05)

### Navegación de Pasos
- **Pasos completados** (1, 2): Círculos azules con números blancos
- **Paso actual** (2): Resaltado con borde azul
- **Pasos pendientes** (3, 4, 5): Círculos grises (#E5E7EB) con números grises (#6B7280)
- **Etiquetas de pasos**: "Información Básica", "Patrones de Sueño", "Rutinas", "Ambiente", "Finalizar"

### Contenido Principal
#### Card Container
- **Fondo**: Blanco (#FFFFFF)
- **Shadow**: 0px 4px 6px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.1)
- **Border radius**: 16px
- **Padding**: 32px

#### Header de Sección
- **Icono**: Círculo azul claro (#F0F7FF) con icono de luna
- **Título**: "Patrones de Sueño" (Inter, 24px, peso 700, #2F2F2F)

#### Preguntas de la Encuesta

**Pregunta 1: Hora de Acostarse**
- **Título**: "¿A qué hora suele acostarse tu hijo/a habitualmente?" (Inter, 20px, peso 600)
- **Descripción**: Texto explicativo en gris (#666666)
- **Opciones**: Botones tipo pill con horarios (19:00, 19:30, 20:00, etc.)
- **Opción seleccionada**: 20:00 con borde azul (#4A90E2)

**Pregunta 2: Horas de Sueño**
- **Tipo**: Radio buttons
- **Opciones**: "Menos de 7 horas", "7-8 horas", "9-10 horas", "11-12 horas", "Más de 12 horas"
- **Seleccionada**: "9-10 horas" con círculo azul relleno

**Pregunta 3: Despertares Nocturnos**
- **Tipo**: Slider control
- **Etiqueta**: "Frecuencia de despertares"
- **Opciones**: "Nunca", "1-2 veces", "3-4 veces", "5+ veces"
- **Control deslizante**: Fondo gris (#E5E5E5), handle azul (#628BE6)

**Pregunta 4: Hora de Despertar**
- **Similar a pregunta 1**: Botones pill con horarios matutinos
- **Seleccionada**: "6:30" con borde azul

**Pregunta 5: Siestas**
- **Tipo**: Radio buttons
- **Opciones**: "No, nunca hace siestas", "Ocasionalmente (1-2 veces por semana)", "Regularmente (3-5 veces por semana)", "Diariamente (todos los días)"
- **Seleccionada**: "Regularmente (3-5 veces por semana)"

#### Nota Informativa
- **Fondo**: Azul claro (#F0F7FF)
- **Icono**: Información en azul (#91C1F8)
- **Texto**: Mensaje tranquilizador sobre la normalidad de la variación en patrones de sueño

### Botones de Navegación
- **Botón Anterior**: 
  - Fondo blanco, borde gris (#E5E5E5)
  - Texto gris (#3A3A3A), icono de flecha izquierda
  - Dimensiones: 173.94px × 50px
- **Botón Siguiente**: 
  - Gradiente azul (#628BE6 a #67C5FF)
  - Texto blanco, icono de flecha derecha
  - Dimensiones: 181.73px × 50px
  - Shadow: 0px 1px 2px rgba(0,0,0,0.05)

### Enlace Secundario
- **Texto**: "Guardar y continuar más tarde" (Inter, 16px, peso 500, #4A90E2)
- **Icono**: Diskette en azul
- **Posición**: Centrado debajo de los botones principales

---

## Screen 4: Configuración de Cuenta

### Estructura General
- **Layout**: Pantalla completa con sidebar izquierdo y contenido principal
- **Dimensiones**: 1440px × 1911px
- **Sidebar**: 256px de ancho con gradiente (#EAE8FE a #6AAAFA)

### Sidebar de Navegación
#### Header
- **Logo**: Círculo con gradiente azul (#4A90E2 a #2553A1)
- **Texto**: "Happy Dreamers" (Inter, 20px, peso 600, #2F2F2F)

#### Menú de Navegación
- **Dashboard**: Activo con fondo azul claro (#F0F7FF), icono y texto azul (#2553A1)
- **Análisis de Sueño**: Inactivo, texto gris (#4D4E78)
- **Calendario**: Inactivo, texto gris
- **Diario de Sueño**: Inactivo, texto gris
- **Consejos**: Inactivo, texto gris
- **Configuración**: Inactivo, texto gris

### Contenido Principal
#### Header de Página
- **Título**: "Configuración de Cuenta" (Inter, 30px, peso 700, #1F2937)
- **Subtítulo**: "Gestiona tu perfil, preferencias y configuración de seguridad." (Inter, 16px, #4B5563)

### Sección 1: Información Personal
#### Card Container
- **Fondo**: Blanco (#FFFFFF)
- **Shadow**: 0px 1px 2px rgba(0,0,0,0.05)
- **Border radius**: 16px
- **Header**: "Información Personal" (Inter, 18px, peso 700)

#### Foto de Perfil
- **Avatar**: Círculo con iniciales "MG" en fondo azul claro (#BFD7F3)
- **Dimensiones**: 64px × 64px
- **Título**: "Foto de perfil" (Inter, 16px, peso 500)
- **Descripción**: "Usa una foto o imagen que sea de al menos 132px x 132px."
- **Botones**: 
  - "Cambiar foto" (azul #2553A1, borde azul)
  - "Eliminar" (gris, borde gris #D1D5DB)

#### Formulario de Datos
**Campos en grid 2 columnas:**

**Columna Izquierda:**
- **Nombre Completo**: Input con valor "María González"
- **Número de Teléfono**: Input con valor "+34 612 345 678"

**Columna Derecha:**
- **Correo Electrónico**: Input con valor "maria.gonzalez@email.com"
- **Idioma Preferido**: Select con "Español" seleccionado

**Botón de Acción:**
- "Guardar Cambios": Gradiente azul (#628BE6 a #67C5FF), texto blanco

### Sección 2: Seguridad
#### Cambiar Contraseña
- **Campos**: "Contraseña Actual", "Nueva Contraseña", "Confirmar Nueva Contraseña"
- **Todos los inputs**: Fondo blanco, borde gris (#D1D5DB), border radius 12px
- **Botón**: "Actualizar Contraseña" con gradiente azul

#### Verificación en Dos Pasos
- **Descripción**: Texto explicativo sobre la funcionalidad
- **Toggle Switch**: Desactivado (gris #B2B9C4)

### Sección 3: Preferencias de Notificación
#### Configuraciones con Toggle Switches

**Recordatorios de Sueño:**
- **Estado**: Activado (verde #9BE68C)
- **Descripción**: "Recibe notificaciones para registrar los patrones de sueño de tu hijo/a."

**Consejos Semanales:**
- **Estado**: Activado (verde #9BE68C)
- **Descripción**: "Recibe consejos personalizados para mejorar el sueño de tu hijo/a."

**Actualizaciones de la Aplicación:**
- **Estado**: Desactivado (gris #B2B9C4)
- **Descripción**: "Recibe notificaciones sobre nuevas características y mejoras."

**Correos Electrónicos de Marketing:**
- **Estado**: Desactivado (gris #B2B9C4)
- **Descripción**: "Recibe ofertas especiales y noticias sobre nuestros servicios."

### Sección 4: Acciones de Cuenta
#### Cerrar Sesión
- **Título**: "Cerrar Sesión en Todos los Dispositivos"
- **Descripción**: "Cierra la sesión en todos los dispositivos donde hayas iniciado sesión."
- **Botón**: "Cerrar Sesión" (blanco, borde gris, texto azul)

#### Eliminar Cuenta
- **Título**: "Eliminar Cuenta" (texto rojo #DC2626)
- **Descripción**: "Elimina permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer."
- **Botón**: "Eliminar Cuenta" (blanco, borde rojo #FCA5A5, texto rojo)

### Estilos de Componentes
#### Inputs
- **Fondo**: Blanco (#FFFFFF)
- **Borde**: Gris (#D1D5DB), 1px
- **Border radius**: 12px
- **Padding**: 12px
- **Tipografía**: Inter, 16px, line-height 1.5

#### Toggle Switches
- **Activo**: Verde (#9BE68C) con círculo blanco
- **Inactivo**: Gris (#B2B9C4) con círculo blanco
- **Dimensiones**: 48px × 24px, border radius 9999px

#### Cards
- **Fondo**: Blanco (#FFFFFF)
- **Shadow**: 0px 1px 2px rgba(0,0,0,0.05)
- **Border**: 1px sólido #E5E7EB
- **Border radius**: 16px
- **Padding**: 24px

---

## Screen 5: Modal de Eliminación

### Estructura General
- **Tipo**: Modal overlay centrado
- **Dimensiones**: 448px × 350px
- **Fondo**: Blanco (#FFFFFF)
- **Border radius**: 16px
- **Shadow**: 0px 20px 25px rgba(0,0,0,0.1), 0px 8px 10px rgba(0,0,0,0.1)

### Header del Modal
#### Icono de Advertencia
- **Fondo**: Círculo rojo claro (rgba(208,2,27,0.1))
- **Dimensiones**: 64px × 64px, centrado
- **Icono**: Símbolo de advertencia/exclamación en rojo (#D0021B)
- **Posición**: Centrado horizontalmente

#### Título
- **Texto**: "Confirmar Eliminación" (Inter, 20px, peso 700, #2F2F2F)
- **Posición**: Centrado debajo del icono
- **Margen superior**: 18px desde el icono

### Contenido del Modal
#### Mensaje Principal
- **Texto**: "¿Estás seguro de que quieres eliminar a Martín García ?"
- **Tipografía**: Inter, 12px, peso 400, centrado
- **Color**: Negro (#000000)
- **Posición**: Centrado horizontalmente

#### Mensaje Secundario
- **Texto**: "Esta acción no se puede deshacer y se perderán todos los datos asociados."
- **Tipografía**: Inter, 14px, peso 400, centrado
- **Color**: Rojo claro (#FFC8C8)
- **Margen superior**: 55px desde mensaje principal

### Botones de Acción
#### Contenedor
- **Layout**: Flexbox horizontal
- **Gap**: 16px entre botones
- **Posición**: Parte inferior del modal
- **Margen superior**: 24px desde el mensaje

#### Botón Cancelar
- **Dimensiones**: 193px × 50px
- **Fondo**: Blanco (#FFFFFF)
- **Borde**: 1px sólido #E5E5E5
- **Border radius**: 12px
- **Texto**: "Cancelar" (Inter, 16px, peso 500, centrado)
- **Color de texto**: Gris (#C6C6C6)

#### Botón Confirmar
- **Dimensiones**: 191px × 50px
- **Fondo**: Rojo (#D0021B)
- **Border radius**: 12px
- **Texto**: "Sí, Eliminar" (Inter, 16px, peso 500, centrado)
- **Color de texto**: Blanco (#FFFFFF)

### Especificaciones Técnicas
#### Posicionamiento
- **Modal**: Centrado en viewport con overlay semi-transparente
- **Z-index**: Alto para estar sobre el contenido principal
- **Animación**: Fade in/scale desde el centro

#### Responsive
- **Móvil**: Ajustar ancho a 95% del viewport con margen lateral
- **Tablet**: Mantener dimensiones fijas
- **Desktop**: Centrado absoluto

#### Estados Interactivos
- **Hover en botones**: Ligero cambio de opacidad (0.9)
- **Focus**: Outline azul para accesibilidad
- **Disabled**: Opacidad reducida (0.6) y cursor not-allowed

### Notas de Implementación Finales
- El layout es responsivo con flexbox
- Los eventos en el calendario son clickeables para mostrar detalles
- Las métricas se actualizan dinámicamente según los datos seleccionados
- Los filtros de fechas mantienen estado entre navegaciones
- El panel lateral es colapsable en dispositivos móviles
- Los formularios incluyen validación en tiempo real
- Los toggle switches tienen animación de transición suave
- El modal incluye overlay de fondo semi-transparente
- Los botones tienen estados hover y focus para mejorar UX
- Todos los inputs siguen el design system establecido

---

Este documento proporciona toda la información necesaria para implementar las cinco interfaces principales de Happy Dreamers sin acceso directo al archivo de Figma.
