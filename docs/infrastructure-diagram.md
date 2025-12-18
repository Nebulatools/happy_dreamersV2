# Diagrama de Infraestructura - Happy Dreamers V2

## Topología del Sistema Desplegado

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HAPPY DREAMERS V2 - INFRASTRUCTURE DIAGRAM                               │
│                                      https://happy-dreamers-v2.vercel.app                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                              ┌─────────────────┐
                                              │     CLIENTS     │
                                              └────────┬────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────────────────────┐
                    │                                  │                                  │
                    ▼                                  ▼                                  ▼
          ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
          │   Web Browser   │              │   Mobile PWA    │              │  Desktop PWA    │
          │    (React 19)   │              │   (Service      │              │   (Service      │
          │                 │              │    Worker)      │              │    Worker)      │
          └────────┬────────┘              └────────┬────────┘              └────────┬────────┘
                   │                                │                                │
                   └────────────────────────────────┼────────────────────────────────┘
                                                    │
                                              HTTPS (TLS 1.3)
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           VERCEL EDGE NETWORK                                               │
│                                        (Global CDN - 100+ Locations)                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                         EDGE MIDDLEWARE                                             │   │
│   │  • Rate Limiting              • Security Headers (CSP, X-Frame-Options)                             │   │
│   │  • Request Routing            • Permissions Policy (camera, microphone, geolocation)                │   │
│   │  • Cache Control              • Service Worker Headers (no-cache for sw.js)                         │   │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                    │                                                        │
│                          ┌─────────────────────────┼─────────────────────────┐                              │
│                          │                         │                         │                              │
│                          ▼                         ▼                         ▼                              │
│   ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐        │
│   │      STATIC ASSETS          │  │     NEXT.JS APP ROUTER      │  │    API ROUTES (Serverless)  │        │
│   │  ────────────────────────   │  │  ────────────────────────   │  │  ────────────────────────   │        │
│   │  /public/*                  │  │  Server Components (RSC)    │  │  /api/auth/*                │        │
│   │  • Images                   │  │  Client Components          │  │  /api/children/*            │        │
│   │  • Fonts                    │  │  ────────────────────────   │  │  /api/events/*              │        │
│   │  • service-worker.js        │  │  /auth/* (login, register)  │  │  /api/consultas/*           │        │
│   │  • manifest.json            │  │  /dashboard/*               │  │  /api/chat/*                │        │
│   │  • offline.html             │  │  /dashboard/children/*      │  │  /api/admin/*               │        │
│   │                             │  │  /dashboard/planes/*        │  │  /api/notifications/*       │        │
│   │  Cache: 1 year (immutable)  │  │  /dashboard/calendar/*      │  │  ────────────────────────   │        │
│   └─────────────────────────────┘  │  /dashboard/assistant/*     │  │  Max Duration:              │        │
│                                    │                             │  │  • scheduler: 10s           │        │
│                                    │  ISR + Edge Caching         │  │  • send: 30s                │        │
│                                    └─────────────────────────────┘  └──────────────┬──────────────┘        │
│                                                                                     │                       │
└─────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┘
                                                                                      │
                                                                                      │
                    ┌─────────────────────────────────────────────────────────────────┴─────────────────────┐
                    │                                                                                       │
                    │                              BACKEND SERVICES                                         │
                    │                                                                                       │
                    └───────────┬───────────────────────┬───────────────────────┬───────────────────────────┘
                                │                       │                       │
            ┌───────────────────┴──────────┐           │           ┌───────────┴───────────────────┐
            │                              │           │           │                               │
            ▼                              ▼           ▼           ▼                               ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│   AUTHENTICATION      │   │    DATABASE           │   │   AI / ML SERVICES    │   │  EXTERNAL SERVICES    │
│   ────────────────    │   │   ────────────────    │   │   ────────────────    │   │   ────────────────    │
│                       │   │                       │   │                       │   │                       │
│   ┌───────────────┐   │   │   ┌───────────────┐   │   │   ┌───────────────┐   │   │   ┌───────────────┐   │
│   │  NextAuth.js  │   │   │   │ MongoDB Atlas │   │   │   │   OpenAI API  │   │   │   │  Gmail SMTP   │   │
│   │  ───────────  │   │   │   │  ───────────  │   │   │   │  ───────────  │   │   │   │  ───────────  │   │
│   │  • JWT Tokens │   │   │   │  Cluster:     │   │   │   │  Model:       │   │   │   │  Host:        │   │
│   │  • Sessions   │   │   │   │  nebulaclus   │   │   │   │  GPT-4o-mini  │   │   │   │  smtp.gmail   │   │
│   │  • OAuth      │   │   │   │  ter01        │   │   │   │               │   │   │   │  .com:465     │   │
│   │  • bcryptjs   │   │   │   │               │   │   │   │  Features:    │   │   │   │               │   │
│   │    (hashing)  │   │   │   │  Database:    │   │   │   │  • Chat       │   │   │   │  TLS/SSL      │   │
│   │               │   │   │   │  jaco_db_     │   │   │   │  • RAG        │   │   │   │  Enabled      │   │
│   │  MongoDB      │   │   │   │  ultimate_    │   │   │   │  • Plans      │   │   │   │               │   │
│   │  Adapter      │   │   │   │  2025         │   │   │   │  • Analysis   │   │   │   │  Email:       │   │
│   └───────────────┘   │   │   │               │   │   │   │               │   │   │   │  contact@     │   │
│                       │   │   │  Pool: 10     │   │   │   │  Temp: 0.2    │   │   │   │  ezyai.pro    │   │
│   Roles:              │   │   │  connections  │   │   │   │  MaxTokens:   │   │   │   └───────────────┘   │
│   • parent            │   │   │               │   │   │   │  2000         │   │   │                       │
│   • professional      │   │   │  Compression: │   │   │   └───────────────┘   │   │   ┌───────────────┐   │
│   • admin             │   │   │  snappy+zlib  │   │   │                       │   │   │   Zoom API    │   │
│                       │   │   └───────────────┘   │   │   ┌───────────────┐   │   │   │  ───────────  │   │
└───────────────────────┘   │                       │   │   │  Google AI    │   │   │   │               │   │
                            │   Collections:        │   │   │  ───────────  │   │   │   │  • Meetings   │   │
                            │   ┌───────────────┐   │   │   │  Gemini API   │   │   │   │  • Webhooks   │   │
                            │   │ • users       │   │   │   │  (Backup      │   │   │   │  • OAuth2     │   │
                            │   │ • children    │   │   │   │   Provider)   │   │   │   │               │   │
                            │   │ • events      │   │   │   └───────────────┘   │   │   └───────────────┘   │
                            │   │ • sessions    │   │   │                       │   │                       │
                            │   │ • accounts    │   │   │   ┌───────────────┐   │   │   ┌───────────────┐   │
                            │   │ • tokens      │   │   │   │  LangChain    │   │   │   │ Google APIs   │   │
                            │   └───────────────┘   │   │   │  ───────────  │   │   │   │  ───────────  │   │
                            │                       │   │   │  • LangGraph  │   │   │   │  • Drive      │   │
                            │   Features:           │   │   │  • Embeddings │   │   │   │  • Calendar   │   │
                            │   • Vector Search     │   │   │  • Chains     │   │   │   │               │   │
                            │   • Atlas Search      │   │   │  • RAG        │   │   │   └───────────────┘   │
                            │   • Change Streams    │   │   └───────────────┘   │   │                       │
                            │                       │   │                       │   │                       │
                            └───────────────────────┘   └───────────────────────┘   └───────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            DATA FLOW DIAGRAM                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐                   │
│     │  Client  │─────▶│  Vercel  │─────▶│  API     │─────▶│ MongoDB  │◀────▶│  OpenAI  │                   │
│     │  (PWA)   │◀─────│  Edge    │◀─────│  Routes  │◀─────│  Atlas   │      │  GPT-4   │                   │
│     └──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘                   │
│           │                                   │                                   │                         │
│           │                                   │                                   │                         │
│           │                                   ▼                                   │                         │
│           │                          ┌───────────────┐                            │                         │
│           │                          │   NextAuth    │                            │                         │
│           │                          │  (Sessions)   │                            │                         │
│           │                          └───────────────┘                            │                         │
│           │                                   │                                   │                         │
│           │                                   ▼                                   │                         │
│           │                          ┌───────────────┐                            │                         │
│           └─────────────────────────▶│   Gmail SMTP  │◀───────────────────────────┘                         │
│                (Notifications)       │   (Emails)    │         (AI Reports)                                 │
│                                      └───────────────┘                                                      │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         TECHNOLOGY STACK SUMMARY                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   FRONTEND                    │   BACKEND                     │   INFRASTRUCTURE                            │
│   ─────────────────────────   │   ─────────────────────────   │   ─────────────────────────                 │
│   • Next.js 15.2.6            │   • Node.js (Serverless)      │   • Vercel (Platform)                       │
│   • React 19                  │   • Next.js API Routes        │   • MongoDB Atlas (Database)                │
│   • TypeScript 5              │   • NextAuth.js               │   • Vercel Edge Network (CDN)               │
│   • Tailwind CSS 3.4          │   • Mongoose 8.18             │   • GitHub (Source Control)                 │
│   • shadcn/ui + Radix         │   • Zod (Validation)          │   • GitHub Actions (CI/CD)                  │
│   • React Hook Form           │   • bcryptjs (Security)       │                                             │
│   • Recharts (Charts)         │   • Nodemailer (Email)        │                                             │
│   • Framer Motion             │   • jsPDF (Reports)           │                                             │
│                               │   • OpenAI SDK                │                                             │
│                               │   • LangChain + LangGraph     │                                             │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           SECURITY LAYERS                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   Layer 1: Network          │   Layer 2: Application         │   Layer 3: Data                             │
│   ─────────────────────     │   ─────────────────────────    │   ─────────────────────────                 │
│   • TLS 1.3 Encryption      │   • JWT Token Auth             │   • Password Hashing (bcrypt)               │
│   • Vercel DDoS Protection  │   • RBAC (Role-Based Access)   │   • Data Isolation by Family                │
│   • Security Headers        │   • Input Validation (Zod)     │   • Sanitized Logging                       │
│   • CSP Policy              │   • Rate Limiting              │   • Encrypted Connections                   │
│   • X-Frame-Options         │   • Session Management         │   • No Secrets in Logs                      │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              LEGEND                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   ──────▶  Data Flow (Request/Response)                                                                     │
│   ◀─────▶  Bidirectional Communication                                                                      │
│   ┌─────┐  Service/Component                                                                                │
│   │     │                                                                                                   │
│   └─────┘                                                                                                   │
│                                                                                                             │
│   Production URL: https://happy-dreamers-v2.vercel.app                                                      │
│   Platform: Vercel (Hobby/Pro Plan)                                                                         │
│   Region: Auto (Global Edge Distribution)                                                                   │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Descripción de Componentes

### 1. Capa de Clientes
- **Web Browser**: Aplicación React 19 ejecutándose en navegadores modernos
- **PWA Mobile/Desktop**: Progressive Web App con Service Worker para funcionalidad offline

### 2. Vercel Edge Network
- **CDN Global**: Distribución de contenido estático en 100+ ubicaciones
- **Edge Middleware**: Procesamiento de seguridad y routing
- **Serverless Functions**: API Routes ejecutadas on-demand

### 3. Servicios Backend
- **NextAuth.js**: Sistema completo de autenticación con JWT
- **MongoDB Atlas**: Base de datos NoSQL con vector search
- **OpenAI API**: Modelo GPT-4o-mini para IA conversacional y RAG
- **LangChain/LangGraph**: Orquestación de flujos de IA

### 4. Servicios Externos
- **Gmail SMTP**: Envío de correos transaccionales
- **Zoom API**: Integración de videoconferencias
- **Google APIs**: Drive y Calendar

---

*Documento generado el 18 de Diciembre de 2024*
*Happy Dreamers V2 - Sleep Tracking Platform*
