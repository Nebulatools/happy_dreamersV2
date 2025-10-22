# Happy Dreamers 🌙

Una aplicación integral para el seguimiento y análisis del sueño infantil, combinando tecnología moderna con inteligencia artificial para mejorar el descanso y bienestar de los niños.

> **Estado del Proyecto**: ✅ Sistema 100% completado - Production Ready (Enero 2025)

## 🌟 Características Principales

### 👨‍👩‍👧‍👦 Para Familias
- **Seguimiento Completo**: Registro detallado de patrones de sueño, siestas y actividades
- **Análisis de Emociones**: Tracking del estado emocional y su correlación con el sueño
- **Calendarios Interactivos**: Visualización clara de rutinas y eventos diarios
- **Reportes Personalizados**: Informes detallados con métricas de calidad del sueño

### 🏥 Para Profesionales de la Salud
- **Dashboard Administrativo**: Vista unificada de múltiples familias
- **Evaluaciones Integrales**: Sistema de encuestas dinámicas y detalladas
- **Informes con IA**: Reportes profesionales generados automáticamente
- **Análisis Predictivo**: Identificación de patrones y tendencias

### 🤖 Asistente de IA
- **Consulta Especializada**: Acceso a conocimiento pediátrico especializado
- **Recomendaciones Personalizadas**: Sugerencias basadas en datos específicos del niño
- **Análisis Multi-Agente**: Sistema inteligente que combina datos individuales con conocimiento experto
- **Respuestas Contextuales**: Interacciones naturales con información médica precisa

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 15** - Framework React con App Router
- **React 19** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework de estilos utilitarios
- **shadcn/ui** - Componentes de interfaz consistentes

### Backend & Base de Datos
- **Next.js API Routes** - Endpoints de servidor
- **MongoDB** - Base de datos NoSQL con almacenamiento vectorial
- **NextAuth.js** - Sistema de autenticación completo

### Inteligencia Artificial
- **OpenAI GPT-4** - Modelo de lenguaje avanzado
- **LangChain** - Framework para aplicaciones con LLM
- **LangGraph** - Sistema multi-agente inteligente
- **RAG (Retrieval-Augmented Generation)** - Recuperación de conocimiento especializado

### Herramientas Adicionales
- **bcryptjs** - Hashing de contraseñas
- **jsPDF** - Generación de reportes PDF
- **date-fns** - Manipulación de fechas
- **Recharts** - Visualización de datos

### Testing & CI/CD
- **Jest** - Framework de testing
- **React Testing Library** - Testing de componentes React
- **GitHub Actions** - Pipeline CI/CD automatizado
- **Vercel** - Deployment y hosting

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18.0 o superior
- MongoDB Atlas o instancia local
- Cuenta de OpenAI (para funcionalidades de IA)

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone [repository-url]
cd happy_dreamers_v0
```

2. **Instalar dependencias**
```bash
npm install
# o
pnpm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local` en la raíz del proyecto:

```env
# Base de datos MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/happy_dreamers
MONGODB_DB=happy_dreamers

# Autenticación NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OpenAI para funcionalidades de IA
OPENAI_API_KEY=sk-your-openai-api-key

# Configuración adicional
NODE_ENV=development
```

4. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Configuración de Base de Datos

La aplicación creará automáticamente las colecciones necesarias:

- `users` - Perfiles de usuarios (padres y administradores)
- `children` - Información de niños y datos de encuestas
- `events` - Eventos de sueño, actividades y estados emocionales
- Colecciones vectoriales para el sistema RAG

### Sembrar eventos mínimos para QA (solo desarrollo/preview)

En entornos no productivos puedes sembrar eventos de prueba para un niño y así generar un Plan Inicial rápidamente:

```bash
curl -X POST http://localhost:3000/api/dev/seed-min-events \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=<TU_TOKEN>" \
  -d '{"childId":"<24hex>","count":12}'
```

Respuesta:

```json
{ "ok": true, "inserted": 12, "childId": "<24hex>" }
```

Luego puedes llamar a `/api/v3/plans/initial` para generar un plan en QA sin afectar datos reales.

## 📱 Uso de la Aplicación

### Para Padres

1. **Registro y Login**
   - Crear cuenta con email y contraseña
   - Acceso al dashboard familiar

2. **Configuración Inicial**
   - Añadir perfil del niño
   - Completar encuestas de evaluación inicial
   - Configurar rutinas básicas

3. **Uso Diario**
   - Registrar eventos de sueño y actividades
   - Consultar el asistente de IA
   - Revisar análisis y tendencias

### Para Administradores

1. **Dashboard Administrativo**
   - Vista de todas las familias registradas
   - Métricas agregadas y reportes
   - Gestión de usuarios

2. **Análisis Profesional**
   - Generar reportes detallados con IA
   - Revisar patrones entre familias
   - Acceso a datos de encuestas completas

## 🏗️ Arquitectura del Sistema

### Estructura de Directorios

```
happy_dreamers_v0/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   ├── auth/              # Páginas de autenticación
│   ├── dashboard/         # Dashboard principal
│   └── globals.css        # Estilos globales
├── components/            # Componentes React reutilizables
│   ├── dashboard/         # Componentes específicos del dashboard
│   ├── rag/              # Componentes del sistema de IA
│   ├── stats/            # Componentes de estadísticas
│   ├── survey/           # Componentes de encuestas
│   └── ui/               # Componentes base de UI
├── context/              # Contextos de React
├── hooks/                # Hooks personalizados
├── lib/                  # Utilidades y configuraciones
│   ├── rag/             # Sistema RAG y agentes de IA
│   ├── auth.ts          # Configuración de autenticación
│   ├── mongodb.ts       # Conexión a base de datos
│   └── utils.ts         # Utilidades generales
├── docs/                 # Documentación técnica permanente
├── reference/            # Documentación de referencia
├── session-archive/      # Archivo de contextos históricos
├── tasks/               # Gestión de tareas y TODOs
└── public/              # Archivos estáticos
```

### Flujo de Datos

1. **Autenticación** → NextAuth.js maneja sesiones y roles
2. **Datos del Usuario** → MongoDB almacena perfiles y configuraciones
3. **Eventos** → Sistema de tracking en tiempo real
4. **Análisis de IA** → Procesamiento con sistema multi-agente
5. **Reportes** → Generación automática de PDFs con insights

## 🔒 Seguridad y Privacidad

- **Encriptación de Contraseñas**: bcryptjs para hashing seguro
- **Autenticación Robusta**: JWT tokens con NextAuth.js
- **Autorización por Roles**: Padres vs. administradores
- **Aislamiento de Datos**: Cada familia ve solo su información
- **Validación de Datos**: Esquemas Zod para entrada segura

## 📊 Sistema de Encuestas

### Formularios Disponibles

1. **Información de Padres** - Datos de contacto y salud
2. **Historia del Niño** - Información básica y temperamento
3. **Dinámica Familiar** - Cuidadores y estructura familiar
4. **Información Prenatal** - Embarazo y parto
5. **Actividad Física** - Ejercicio y tiempo de pantalla
6. **Desarrollo y Salud** - Hitos y condiciones médicas
7. **Rutinas de Sueño** - Hábitos y patrones de descanso

### Características del Sistema
- Formularios dinámicos generados desde base de datos
- Validación en tiempo real
- Guardado automático de progreso
- Integración con perfiles de niños

## 🤖 Sistema de IA (RAG)

### Arquitectura Multi-Agente

El sistema utiliza **LangGraph** para implementar múltiples agentes especializados:

#### Router Agent
- Analiza consultas entrantes
- Decide el agente más apropiado
- Optimiza el enrutamiento de preguntas

#### RAG Agent
- Acceso a conocimiento pediátrico especializado
- Búsqueda en documentos médicos
- Recomendaciones basadas en evidencia

#### Child Data Agent
- Análisis de datos específicos del niño
- Cálculos de métricas personalizadas
- Tendencias y patrones individuales

### Herramientas Disponibles
- `rag_search` - Búsqueda en documentos especializados
- `child_data_search` - Análisis de datos del niño
- Monitoreo de rendimiento
- Respuestas contextuales

## 📈 Métricas y Análisis

### Sleep Score (Puntuación de Sueño)
- **Horas de Sueño**: Cálculo basado en edad y recomendaciones
- **Consistencia**: Regularidad en horarios
- **Calidad**: Análisis de despertares nocturnos
- **Estado Emocional**: Correlación con patrones de sueño

### Reportes Generados
- Resúmenes ejecutivos con IA
- Métricas detalladas de sueño
- Recomendaciones personalizadas
- PDFs profesionales para médicos

## 🧪 Testing

### Ejecutar Tests
```bash
# Ejecutar todos los tests
npm test

# Ejecutar en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage

# Ejecutar tests en CI
npm run test:ci
```

### Estructura de Tests
```
__tests__/
├── components/     # Tests de componentes React
├── hooks/          # Tests de hooks personalizados
├── lib/            # Tests de utilidades y validaciones
└── api/            # Tests de endpoints API
```

## 📖 Documentación

Para información técnica detallada, consulta la documentación en:
- `/docs/` - Documentación arquitectónica completa
- `/reference/` - Documentación de features específicas
- `SESSION-CONTEXT.md` - Estado actual del proyecto
- `CLAUDE.md` - Workflow de desarrollo con Claude AI

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows

#### Pipeline Principal (`ci.yml`)
- ✅ Linting y type checking
- ✅ Tests con cobertura
- ✅ Build de producción
- ✅ Escaneo de seguridad
- ✅ Deploy automático a Vercel

#### Validaciones de PR (`pr-checks.yml`)
- ✅ Validación de título de PR
- ✅ Verificación de bundle size
- ✅ Lighthouse CI para métricas
- ✅ Review de dependencias

### Configurar CI/CD
1. Configurar secrets en GitHub:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
2. Habilitar GitHub Actions en el repositorio
3. Los workflows se ejecutarán automáticamente

## 🎨 Diseño y UX

### Principios de Diseño
- **Intuitividad**: Interfaz clara y fácil de usar
- **Accesibilidad**: Cumplimiento con estándares WCAG
- **Responsividad**: Optimizado para móviles y desktop
- **Consistencia**: Design system unificado con shadcn/ui

### Modo Oscuro/Claro
- Soporte completo para ambos temas
- Persistencia de preferencias
- Transiciones suaves

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo

# Construcción
npm run build        # Build de producción
npm run start        # Servidor de producción

# Calidad de código
npm run lint         # Linting con ESLint
```

## 🤝 Contribución

### Guías de Desarrollo
1. Seguir convenciones de TypeScript
2. Usar componentes shadcn/ui cuando sea posible
3. Implementar validación con Zod
4. Mantener separación de responsabilidades
5. Documentar cambios significativos

### Estructura de Commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formato y estilo
refactor: refactorización de código
test: pruebas
chore: tareas de mantenimiento
```

## 🐛 Resolución de Problemas

### Problemas Comunes

**Error de conexión a MongoDB**
- Verificar MONGODB_URI en .env.local
- Confirmar acceso desde IP actual en MongoDB Atlas

**Problemas de autenticación**
- Revisar NEXTAUTH_SECRET
- Verificar configuración de NEXTAUTH_URL

**Errores de IA**
- Validar OPENAI_API_KEY
- Confirmar límites de API de OpenAI

### Logs y Debugging
- Revisar consola del navegador para errores frontend
- Verificar logs del servidor en terminal
- Usar herramientas de desarrollo de React

## 📄 Licencia

Este proyecto está bajo licencia propietaria. Todos los derechos reservados.

## 👥 Equipo de Desarrollo

- **Desarrollador Principal**: [Nombre]
- **Especialista en IA**: [Nombre]
- **Consultor Pediátrico**: Dr. Mariana (Personalidad de IA)

## 📞 Soporte

Para soporte técnico o consultas:
- Email: support@happydreamers.com
- Documentación: [URL de documentación]
- Issues: [URL de GitHub Issues]

---

**Happy Dreamers** - Mejorando el sueño infantil con tecnología e inteligencia artificial. 🌙✨
