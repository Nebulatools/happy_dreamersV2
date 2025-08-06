# 🌙 Happy Dreamers - Documentation

> **Plataforma integral de seguimiento del sueño infantil con consultoría impulsada por IA**

## 📚 Tabla de Contenidos

- [Visión General](#visión-general)
- [Inicio Rápido](#inicio-rápido)
- [Documentación](#documentación)
- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)

## 🎯 Visión General

Happy Dreamers es una plataforma avanzada diseñada para ayudar a padres y profesionales de la salud a monitorear, analizar y mejorar los patrones de sueño infantil. La aplicación combina tecnología moderna con inteligencia artificial para ofrecer recomendaciones personalizadas basadas en datos reales.

### Problema que Resuelve

- **Para Padres**: Dificultad para identificar y resolver problemas de sueño en sus hijos
- **Para Profesionales**: Necesidad de herramientas digitales para seguimiento y análisis
- **Para Niños**: Mejora en la calidad del sueño y bienestar general

### Solución

Una plataforma integral que ofrece:
- Registro detallado de eventos de sueño
- Análisis impulsado por IA (GPT-4)
- Consultoría virtual personalizada
- Visualizaciones y estadísticas comprensibles
- Soporte multi-niño por familia

## 🚀 Inicio Rápido

### Prerequisitos

```bash
# Node.js 18+ y npm/pnpm
node --version  # v18.0.0 o superior
npm --version   # 8.0.0 o superior
```

### Instalación

```bash
# Clonar el repositorio
git clone [repository-url]
cd happy_dreamers_v0

# Instalar dependencias
npm install
# o
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

### Variables de Entorno Requeridas

```env
# Base de Datos
MONGODB_URI=mongodb://localhost:27017/happy_dreamers

# Autenticación
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# APIs de IA
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GOOGLE_GEMINI_API_KEY=...

# Configuración
NODE_ENV=development
```

### Ejecutar en Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

### Comandos Disponibles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Compilar para producción
npm run start      # Ejecutar build de producción
npm run lint       # Ejecutar linter
npm run type-check # Verificar tipos TypeScript
npm run check-all  # Lint + Type check
```

## 📖 Documentación

### Guías Principales

| Documento | Descripción |
|-----------|------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitectura del sistema y decisiones de diseño |
| [API_REFERENCE.md](./API_REFERENCE.md) | Referencia completa de endpoints API |
| [COMPONENTS.md](./COMPONENTS.md) | Guía de componentes Frontend |
| [DATABASE.md](./DATABASE.md) | Esquema de base de datos y modelos |
| [SECURITY.md](./SECURITY.md) | Prácticas y políticas de seguridad |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Guía de despliegue y configuración |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Flujo de desarrollo y estándares |

### Guías Adicionales

| Documento | Descripción |
|-----------|------------|
| [AI_INTEGRATION.md](./AI_INTEGRATION.md) | Integración con OpenAI y LangChain |
| [TESTING.md](./TESTING.md) | Estrategia y guías de testing |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Solución de problemas comunes |

## ✨ Características Principales

### 👨‍👩‍👧‍👦 Gestión Familiar
- Soporte para múltiples niños por familia
- Perfiles individualizados por niño
- Historial completo de sueño
- Compartir acceso entre cuidadores

### 📊 Registro de Eventos
- **Tipos de Sueño**: Nocturno, Siesta, Despertar
- **Estados Emocionales**: 8 estados diferentes
- **Datos Capturados**: Hora, duración, calidad, notas
- **Actividades Extra**: Registro de actividades relacionadas

### 🤖 IA y Análisis
- **Motor**: OpenAI GPT-4
- **RAG System**: Documentos de conocimiento especializado
- **Análisis Personalizado**: Basado en datos individuales
- **Recomendaciones**: Planes de acción específicos

### 📈 Visualizaciones
- Gráficos de tendencias de sueño
- Comparación entre períodos
- Distribución de estados emocionales
- Métricas de consistencia
- Indicadores de progreso

### 👩‍⚕️ Portal Profesional
- Dashboard administrativo
- Gestión de pacientes
- Reportes detallados
- Seguimiento de consultas

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 15.2.4 (App Router)
- **UI Library**: React 19
- **Lenguaje**: TypeScript 5
- **Estilos**: Tailwind CSS
- **Componentes**: shadcn/ui
- **Gráficos**: Recharts
- **Formularios**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Base de Datos**: MongoDB
- **Autenticación**: NextAuth.js
- **Validación**: Zod

### IA y Procesamiento
- **LLM Principal**: OpenAI GPT-4
- **Framework IA**: LangChain + LangGraph
- **RAG**: Vector Store personalizado
- **Procesamiento Docs**: Mammoth, FAISS

### DevOps y Herramientas
- **Hosting**: Optimizado para Vercel
- **Logging**: Sistema personalizado
- **Linting**: ESLint
- **Type Checking**: TypeScript

## 📁 Estructura del Proyecto

```
happy_dreamers_v0/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Autenticación
│   │   ├── children/     # Gestión de niños
│   │   ├── events/       # Eventos de sueño
│   │   ├── consultas/    # Consultas IA
│   │   └── rag/          # Sistema RAG
│   ├── dashboard/         # Páginas del dashboard
│   └── auth/             # Páginas de autenticación
├── components/            # Componentes React
│   ├── ui/               # Componentes base
│   ├── dashboard/        # Componentes dashboard
│   ├── events/           # Componentes de eventos
│   └── consultas/        # Componentes de consultas
├── lib/                   # Utilidades y configuración
│   ├── mongodb.ts        # Conexión DB
│   ├── auth.ts           # Config NextAuth
│   └── rag/              # Sistema RAG
├── hooks/                 # Custom React Hooks
├── context/              # Context Providers
├── types/                # TypeScript types
└── docs/                 # Documentación
```

## 🤝 Contribuir

Por favor, lee [DEVELOPMENT.md](./DEVELOPMENT.md) para detalles sobre nuestro código de conducta y el proceso para enviarnos pull requests.

## 📄 Licencia

Este proyecto es propietario y confidencial. Todos los derechos reservados.

## 🆘 Soporte

Para soporte y preguntas:
- Revisar [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Contactar al equipo de desarrollo
- Abrir un issue en el repositorio

---

**Happy Dreamers v0** - Mejorando el sueño infantil con tecnología e inteligencia artificial 🌙