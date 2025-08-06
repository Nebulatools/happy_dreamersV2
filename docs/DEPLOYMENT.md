# =€ Guía de Despliegue - Happy Dreamers

## =Ë Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración de Entorno](#configuración-de-entorno)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Configuración de MongoDB Atlas](#configuración-de-mongodb-atlas)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoreo](#monitoreo)
- [Troubleshooting](#troubleshooting)

## =Ë Requisitos Previos

### Herramientas Necesarias
- Node.js 18+ 
- npm o pnpm
- Git
- Vercel CLI (opcional)
- MongoDB Atlas cuenta

### Cuentas y Servicios
- **Vercel**: Para hosting
- **MongoDB Atlas**: Base de datos
- **OpenAI**: API Key para GPT-4
- **Google Cloud**: API Key para Gemini (opcional)
- **GitHub**: Repositorio de código

## ™ Configuración de Entorno

### Variables de Entorno

```bash
# .env.production
# Base de Datos
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/happy_dreamers?retryWrites=true&w=majority

# Autenticación
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-generated-secret-key-min-32-chars

# APIs de IA
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GOOGLE_GEMINI_API_KEY=...

# Configuración
NODE_ENV=production

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring (opcional)
SENTRY_DSN=https://...@sentry.io/...
```

### Generación de Secretos

```bash
# Generar NEXTAUTH_SECRET
openssl rand -base64 32

# O usar el generador de Next.js
npx auth secret
```

## < Despliegue en Vercel

### Método 1: Vercel Dashboard

1. **Importar Proyecto**
   ```
   1. Ir a https://vercel.com/new
   2. Conectar cuenta de GitHub
   3. Importar repositorio happy_dreamers_v0
   4. Configurar proyecto
   ```

2. **Configuración del Proyecto**
   ```yaml
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Variables de Entorno**
   ```
   Settings > Environment Variables
   Añadir todas las variables de .env.production
   ```

4. **Dominios**
   ```
   Settings > Domains
   Añadir dominio personalizado
   Configurar DNS
   ```

### Método 2: Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar
vercel --prod

# Configurar variables de entorno
vercel env add MONGODB_URI production
vercel env add NEXTAUTH_SECRET production
# ... añadir todas las variables

# Redesplegar con nuevas variables
vercel --prod --force
```

### Método 3: GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## <C Configuración de MongoDB Atlas

### 1. Crear Cluster

```yaml
Provider: AWS / GCP / Azure
Region: Closest to users
Cluster Tier: M10 (producción mínimo)
MongoDB Version: 7.0+
Backup: Enabled
```

### 2. Configuración de Red

```yaml
Network Access:
  - Add IP Address
  - Allow from Vercel IPs (o 0.0.0.0/0 con cuidado)
  
Database Access:
  - Create database user
  - Username: happy_dreamers_prod
  - Password: [secure password]
  - Roles: readWrite on happy_dreamers DB
```

### 3. Connection String

```bash
mongodb+srv://happy_dreamers_prod:password@cluster.mongodb.net/happy_dreamers?retryWrites=true&w=majority
```

### 4. Índices Requeridos

```javascript
// Ejecutar en MongoDB Atlas Console
use happy_dreamers

// Users
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

// Children
db.children.createIndex({ parentId: 1 })
db.children.createIndex({ createdAt: -1 })

// Events
db.events.createIndex({ childId: 1, timestamp: -1 })
db.events.createIndex({ type: 1 })

// Consultations
db.consultations.createIndex({ childId: 1, date: -1 })
```

### 5. Backup Configuration

```yaml
Backup Schedule:
  Type: Continuous
  Point in Time Restore: Enabled
  Retention: 7 days
  
Snapshots:
  Frequency: Daily
  Retention: 30 days
  Time: 02:00 UTC
```

## = CI/CD Pipeline

### GitHub Actions Completo

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: .next

  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## =Ê Monitoreo

### Vercel Analytics

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### Sentry Error Tracking

```bash
# Instalar
npm install @sentry/nextjs

# Configurar
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
})
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    server: "ok",
    database: "unknown",
    timestamp: new Date().toISOString()
  }
  
  try {
    // Check database
    const client = await clientPromise
    await client.db().admin().ping()
    checks.database = "ok"
  } catch (error) {
    checks.database = "error"
  }
  
  const status = checks.database === "ok" ? 200 : 503
  
  return NextResponse.json(checks, { status })
}
```

### Uptime Monitoring

```yaml
# Usar servicios como:
- UptimeRobot
- Pingdom
- StatusCake

# Configuración:
URL: https://your-domain.com/api/health
Interval: 5 minutes
Timeout: 30 seconds
Alerts: Email, SMS, Slack
```

## =' Configuración de Producción

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  experimental: {
    serverActions: true,
  },
  
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
  ],
}

module.exports = nextConfig
```

### Performance Optimization

```javascript
// Lazy loading
const HeavyComponent = dynamic(
  () => import('../components/HeavyComponent'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
)

// Image optimization
import Image from 'next/image'

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false}
  loading="lazy"
  placeholder="blur"
/>

// Font optimization
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})
```

## = Troubleshooting

### Problemas Comunes

#### Build Failures

```bash
# Limpiar cache
rm -rf .next node_modules
npm install
npm run build

# Verificar TypeScript
npm run type-check

# Verificar variables de entorno
vercel env pull
```

#### MongoDB Connection Issues

```javascript
// Verificar whitelist IPs
// MongoDB Atlas > Network Access
// Añadir: 0.0.0.0/0 (temporal para debug)

// Test connection
const { MongoClient } = require('mongodb')
const uri = process.env.MONGODB_URI

MongoClient.connect(uri)
  .then(() => console.log('Connected'))
  .catch(err => console.error('Error:', err))
```

#### Memory Issues

```javascript
// Aumentar memoria para build
// package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### Logs y Debugging

```bash
# Ver logs en Vercel
vercel logs [deployment-url]

# Logs en tiempo real
vercel logs [deployment-url] --follow

# Logs de función específica
vercel logs [deployment-url] --filter=api/children
```

## =Ë Checklist de Despliegue

### Pre-Despliegue
- [ ] Todas las pruebas pasan
- [ ] Variables de entorno configuradas
- [ ] Base de datos configurada y con índices
- [ ] Backup de base de datos activado
- [ ] SSL/TLS configurado
- [ ] Rate limiting configurado
- [ ] CSP headers configurados

### Post-Despliegue
- [ ] Health check funcionando
- [ ] Monitoreo activado
- [ ] Alertas configuradas
- [ ] Performance aceptable
- [ ] Logs revisados
- [ ] Backup verificado
- [ ] Documentación actualizada

---

**Última actualización:** Enero 2024  
**Versión:** 1.0.0