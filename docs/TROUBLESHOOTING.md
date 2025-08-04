# =' Troubleshooting - Happy Dreamers

## =Ë Tabla de Contenidos

- [Problemas Comunes](#problemas-comunes)
- [Errores de Desarrollo](#errores-de-desarrollo)
- [Errores de Producción](#errores-de-producción)
- [Base de Datos](#base-de-datos)
- [Autenticación](#autenticación)
- [API y Backend](#api-y-backend)
- [Frontend y UI](#frontend-y-ui)
- [IA y RAG](#ia-y-rag)
- [Performance](#performance)
- [Deployment](#deployment)
- [Herramientas de Debug](#herramientas-de-debug)

## =4 Problemas Comunes

### Error: Cannot find module '@/components/...'

**Síntoma:**
```
Module not found: Can't resolve '@/components/ui/button'
```

**Causa:** Path alias no configurado correctamente.

**Solución:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Error: EADDRINUSE - Puerto 3000 en uso

**Síntoma:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
```bash
# Encontrar proceso usando el puerto
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O usar otro puerto
PORT=3001 npm run dev
```

### Error: Module not found - Can't resolve package

**Síntoma:**
```
Module not found: Can't resolve 'package-name'
```

**Solución:**
```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Si usa pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm store prune
pnpm install
```

## =» Errores de Desarrollo

### Next.js Fast Refresh no funciona

**Síntoma:** Cambios no se reflejan automáticamente.

**Causas y Soluciones:**

1. **Problema con exportaciones:**
```tsx
// L MAL - Fast Refresh no funciona
export default function Component() { }
const helper = () => { }
export { helper }

//  BIEN
export default function Component() { }
export const helper = () => { }
```

2. **Hooks fuera de componentes:**
```tsx
// L MAL
const data = useState()

//  BIEN
function Component() {
  const data = useState()
}
```

3. **Limpiar .next:**
```bash
rm -rf .next
npm run dev
```

### TypeScript Errors

**Error: Type 'X' is not assignable to type 'Y'**

**Solución:**
```typescript
// 1. Verificar tipos
interface Props {
  name: string
  age?: number  // Hacer opcional si es necesario
}

// 2. Type assertion (usar con cuidado)
const data = response as ExpectedType

// 3. Type guards
function isUser(obj: any): obj is User {
  return obj && typeof obj.email === 'string'
}
```

### ESLint Warnings

**Desactivar regla específica:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unused = 'temporal'

/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  // Lógica
}, []) // Dependencias vacías intencionales
/* eslint-enable react-hooks/exhaustive-deps */
```

## < Errores de Producción

### Error 500: Internal Server Error

**Diagnóstico:**
```typescript
// app/api/debug/route.ts (solo desarrollo)
export async function GET() {
  try {
    // Verificar servicios
    const checks = {
      database: await checkDatabase(),
      auth: await checkAuth(),
      ai: await checkAI(),
    }
    
    return NextResponse.json(checks)
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
```

### Build Failures

**Error: Build optimization failed**

**Solución:**
```bash
# Aumentar memoria para build
NODE_OPTIONS='--max-old-space-size=4096' npm run build

# Verificar imports dinámicos
// Cambiar import dinámico problemático
const Component = dynamic(() => import('./Component'), {
  ssr: false  // Desactivar SSR si es necesario
})
```

### Vercel Deployment Issues

**Error: Function timeout**

**Solución:**
```typescript
// vercel.json
{
  "functions": {
    "app/api/heavy-task/route.ts": {
      "maxDuration": 30  // Aumentar timeout (max 30s en hobby)
    }
  }
}
```

## =Ä Base de Datos

### MongoDB Connection Failed

**Error:**
```
MongoServerError: bad auth : Authentication failed
```

**Verificación:**
```typescript
// scripts/test-connection.js
const { MongoClient } = require('mongodb')

async function testConnection() {
  const uri = process.env.MONGODB_URI
  
  try {
    const client = new MongoClient(uri)
    await client.connect()
    console.log(' Conexión exitosa')
    
    // Verificar base de datos
    const db = client.db()
    const collections = await db.listCollections().toArray()
    console.log('Colecciones:', collections.map(c => c.name))
    
    await client.close()
  } catch (error) {
    console.error('L Error:', error.message)
  }
}

testConnection()
```

### Connection Pool Exhausted

**Síntoma:** Timeouts esporádicos en producción.

**Solución:**
```typescript
// lib/mongodb.ts
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 5000,
}

// Asegurar singleton
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}
```

### Query Performance Issues

**Diagnóstico:**
```javascript
// MongoDB Shell
db.events.explain("executionStats").find({
  childId: ObjectId("..."),
  timestamp: { $gte: ISODate("2024-01-01") }
})

// Crear índices si faltan
db.events.createIndex({ childId: 1, timestamp: -1 })
db.events.createIndex({ type: 1 })
```

## = Autenticación

### NextAuth Session Problems

**Error: [next-auth][error][CLIENT_FETCH_ERROR]**

**Solución:**
```typescript
// Verificar NEXTAUTH_URL
NEXTAUTH_URL=http://localhost:3000  // desarrollo
NEXTAUTH_URL=https://your-domain.com  // producción

// Verificar callbacks
export const authOptions: NextAuthOptions = {
  callbacks: {
    async session({ session, token }) {
      // Asegurar que retorna objeto válido
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session  // IMPORTANTE: retornar session
    },
  },
}
```

### JWT Token Issues

**Error: invalid signature**

**Causa:** NEXTAUTH_SECRET no coincide.

**Solución:**
```bash
# Generar nuevo secret
openssl rand -base64 32

# Actualizar en .env y Vercel
NEXTAUTH_SECRET=your-new-secret
```

### Session Not Persisting

**Solución:**
```typescript
// Verificar cookies
// app/api/auth/[...nextauth]/route.ts
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
}
```

## < API y Backend

### CORS Errors

**Error:** Access to fetch at 'X' from origin 'Y' has been blocked by CORS policy

**Solución:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle CORS
  const response = NextResponse.next()
  
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}
```

### API Rate Limiting

**Implementar rate limiting:**
```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache'

type Options = {
  uniqueTokenPerInterval?: number
  interval?: number
}

export default function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  })
  
  return {
    check: (res: Response, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0]
        if (tokenCount[0] === 0) {
          tokenCache.set(token, [1])
        }
        tokenCount[0] += 1
        
        const currentUsage = tokenCount[0]
        const isRateLimited = currentUsage >= limit
        
        if (isRateLimited) {
          reject(new Error('Rate limit exceeded'))
        } else {
          resolve()
        }
      })
  }
}
```

### Request Timeout

**Solución con AbortController:**
```typescript
// lib/fetch-with-timeout.ts
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 5000
) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}
```

## <¨ Frontend y UI

### Hydration Errors

**Error:** Hydration failed because the initial UI does not match

**Causas comunes:**

1. **Fecha/Hora:**
```tsx
// L MAL
<div>{new Date().toLocaleString()}</div>

//  BIEN
import { useEffect, useState } from 'react'

function Clock() {
  const [date, setDate] = useState<Date>()
  
  useEffect(() => {
    setDate(new Date())
  }, [])
  
  if (!date) return null
  return <div>{date.toLocaleString()}</div>
}
```

2. **localStorage:**
```tsx
// L MAL
const theme = localStorage.getItem('theme')

//  BIEN
const [theme, setTheme] = useState<string>()

useEffect(() => {
  setTheme(localStorage.getItem('theme'))
}, [])
```

### Componente no renderiza

**Debugging:**
```tsx
// Añadir console.logs
function Component({ data }) {
  console.log('Render:', { data })
  
  if (!data) {
    console.log('No data, returning null')
    return null
  }
  
  return <div>{data}</div>
}

// Verificar props
function Parent() {
  const data = useData()
  console.log('Parent data:', data)
  
  return <Component data={data} />
}
```

### State Updates Not Working

**Problema común con objetos/arrays:**
```tsx
// L MAL - Mutación directa
const [items, setItems] = useState([1, 2, 3])
items.push(4)
setItems(items) // No triggerea re-render

//  BIEN - Nuevo array
setItems([...items, 4])

// Para objetos
const [user, setUser] = useState({ name: 'John' })
// L MAL
user.name = 'Jane'
setUser(user)

//  BIEN
setUser({ ...user, name: 'Jane' })
```

## > IA y RAG

### OpenAI API Errors

**Error: Rate limit exceeded**

**Solución con retry:**
```typescript
import { backOff } from 'exponential-backoff'

async function callOpenAI(prompt: string) {
  return backOff(
    async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      })
      return response
    },
    {
      numOfAttempts: 5,
      startingDelay: 2000,
      timeMultiple: 2,
      retry: (error: any) => {
        if (error?.response?.status === 429) {
          console.log('Rate limited, retrying...')
          return true
        }
        return false
      },
    }
  )
}
```

### Token Limit Exceeded

**Solución:**
```typescript
// lib/token-manager.ts
import { encoding_for_model } from 'tiktoken'

function countTokens(text: string, model = 'gpt-4') {
  const encoding = encoding_for_model(model)
  const tokens = encoding.encode(text)
  encoding.free()
  return tokens.length
}

function truncateToTokenLimit(text: string, maxTokens = 3000) {
  const tokens = countTokens(text)
  
  if (tokens <= maxTokens) return text
  
  // Truncar por caracteres aproximados (1 token H 4 chars)
  const ratio = maxTokens / tokens
  const maxChars = Math.floor(text.length * ratio * 0.9) // 90% para seguridad
  
  return text.substring(0, maxChars) + '...'
}
```

### Vector Search Not Returning Results

**Diagnóstico:**
```typescript
// Debug vector search
async function debugVectorSearch(query: string) {
  // 1. Verificar embedding
  const embedding = await getEmbedding(query)
  console.log('Embedding length:', embedding.length)
  console.log('Sample values:', embedding.slice(0, 5))
  
  // 2. Verificar índice
  const indexInfo = await db.collection('documents')
    .indexInformation()
  console.log('Indexes:', indexInfo)
  
  // 3. Buscar sin vector (text search)
  const textResults = await db.collection('documents')
    .find({ $text: { $search: query } })
    .limit(5)
    .toArray()
  console.log('Text search results:', textResults.length)
  
  // 4. Verificar vector search
  const vectorResults = await vectorStore.similaritySearch(query, 5)
  console.log('Vector results:', vectorResults.length)
  
  return { embedding, textResults, vectorResults }
}
```

## ¡ Performance

### Slow Page Load

**Análisis con Chrome DevTools:**
```javascript
// En Console
performance.mark('start')
// ... código ...
performance.mark('end')
performance.measure('Mi operación', 'start', 'end')

const entries = performance.getEntriesByType('measure')
console.table(entries)
```

**Optimizaciones:**
```tsx
// 1. Lazy loading
const HeavyComponent = dynamic(() => import('./Heavy'), {
  loading: () => <Skeleton />,
  ssr: false
})

// 2. Image optimization
import Image from 'next/image'

<Image
  src="/large-image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false}  // Solo true para above-the-fold
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// 3. Code splitting
if (condition) {
  const module = await import('./optional-module')
  module.doSomething()
}
```

### Memory Leaks

**Detección:**
```tsx
// Cleanup en useEffect
useEffect(() => {
  const timer = setInterval(() => {}, 1000)
  const handler = () => {}
  
  window.addEventListener('resize', handler)
  
  // IMPORTANTE: Cleanup
  return () => {
    clearInterval(timer)
    window.removeEventListener('resize', handler)
  }
}, [])

// Verificar con Chrome DevTools
// Memory > Take Heap Snapshot
// Comparar snapshots antes/después
```

## =€ Deployment

### Vercel Build Errors

**Error: Command "npm run build" exited with 1**

**Debugging:**
```bash
# Build local con configuración de producción
NODE_ENV=production npm run build

# Verificar variables de entorno
vercel env pull .env.production.local

# Logs detallados
vercel logs --debug
```

### Environment Variables Not Working

**Verificación:**
```typescript
// app/api/debug/env/route.ts
export async function GET() {
  const requiredEnvVars = [
    'MONGODB_URI',
    'NEXTAUTH_SECRET',
    'OPENAI_API_KEY',
  ]
  
  const missing = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  )
  
  return NextResponse.json({
    missing,
    nodeEnv: process.env.NODE_ENV,
    hasMongoUri: !!process.env.MONGODB_URI,
    hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
  })
}
```

## =' Herramientas de Debug

### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "env": {
        "NODE_OPTIONS": "--inspect"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Utilities

```typescript
// lib/debug.ts
export const debug = {
  // Logging condicional
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args)
    }
  },
  
  // Performance timing
  time: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label)
    }
  },
  
  timeEnd: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(label)
    }
  },
  
  // Object inspection
  inspect: (obj: any, depth = 2) => {
    if (process.env.NODE_ENV === 'development') {
      console.dir(obj, { depth, colors: true })
    }
  },
  
  // Stack trace
  trace: (message?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.trace(message)
    }
  },
}

// Uso
import { debug } from '@/lib/debug'

debug.time('api-call')
const data = await fetchData()
debug.timeEnd('api-call')
debug.log('Data received:', data)
```

### Browser DevTools

```javascript
// React DevTools
// Instalar extensión y usar:
$r  // Componente seleccionado
$r.props  // Props del componente
$r.state  // State del componente

// Performance profiling
React.Profiler  // Wrap components

// Network inspection
// DevTools > Network > Filtrar por Fetch/XHR
// Ver payloads y responses

// Console helpers
console.table(data)  // Tabla formateada
console.group('Group')  // Agrupar logs
console.time('Operation')  // Timing
console.trace()  // Stack trace
```

---

**Última actualización:** Enero 2024  
**Versión:** 1.0.0  
**Soporte:** support@happydreamers.com