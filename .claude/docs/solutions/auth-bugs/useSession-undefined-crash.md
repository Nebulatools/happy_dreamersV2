---
title: useSession() retorna undefined en paginas nuevas de Vercel
category: auth-bugs
date: 2026-02-05
severity: critical
tags: useSession, next-auth, SessionProvider, ErrorBoundary, server-component, Vercel, hydration
---

# useSession() retorna undefined — Crash en paginas nuevas desplegadas en Vercel

## Problema

La ruta `/dashboard/diagnosticos` (Sprint 4A/4B) mostraba "Ups! Algo salio mal"
(ErrorBoundary) tanto para usuarios normales como para admins en el deploy de Vercel QA.
Localmente el build pasaba sin errores.

### Error exacto del console (produccion minificada)

```
TypeError: Cannot destructure property 'data' of '(0 , r.useSession)(...)' as it is undefined.
    at p (page-09d0008056d80a39.js:1:3994)
```

### Contexto

- `diagnosticos/page.tsx` era `"use client"` con `const { data: session, status } = useSession()`
- El root layout (`app/layout.tsx:64`) SI tiene `<AuthProvider>` → `<SessionProvider>`
- Otras 15+ paginas del dashboard usan `useSession()` sin problemas
- El error ocurria SOLO en esta pagina nueva, tanto para admin como para no-admin

## Causa Raiz

`useSession()` de next-auth lee de `SessionContext` via `useContext()`. Si el contexto
no esta disponible, retorna `undefined` (no un objeto vacio). Destructurar `undefined`
lanza TypeError.

La causa especifica es un problema de hidratacion/streaming en la combinacion:
- **Next.js 15** con React Server Components y streaming
- **React 19** con concurrent features y selective hydration
- **Vercel deployment** con edge runtime

En paginas nuevas que se cargan via URL directa (no client-side navigation), el componente
puede hidratarse antes de que el `SessionProvider` del root layout haya proporcionado su valor
al contexto. Otras paginas no sufren esto porque sus chunks JS ya estaban cacheados o se
cargan via client-side navigation dentro de un arbol ya hidratado.

### Factores agravantes

- `package.json` usa `"next-auth": "latest"` (no version pinneada)
- `next.config.mjs` tiene `typescript: { ignoreBuildErrors: true }` — errores de tipos no bloquean build
- No hay `error.tsx` en la ruta de diagnosticos para capturar errores con stack trace detallado

## Solucion

Convertir la pagina de `"use client"` con `useSession()` a **server component** con
`getServerSession()`, y extraer la logica client-side a un componente separado.

### Antes (CRASHEABA)

```typescript
// diagnosticos/page.tsx
"use client"
import { useSession } from "next-auth/react"

export default function DiagnosticosPage() {
  const { data: session, status } = useSession()  // ← undefined en Vercel
  // ...
}
```

### Despues (CORRECTO)

```typescript
// diagnosticos/page.tsx (SERVER COMPONENT - sin "use client")
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DiagnosticosClient from "./DiagnosticosClient"

export default async function DiagnosticosPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) redirect("/auth/login")
  if (session.user.role !== "admin") redirect("/dashboard")

  return <DiagnosticosClient />
}
```

```typescript
// diagnosticos/DiagnosticosClient.tsx ("use client")
// Solo logica que necesita hooks de cliente (useActiveChild, useRouter)
// NO usa useSession — auth ya verificada en server component
```

### Beneficios adicionales del fix

1. No-admins reciben redirect limpio a `/dashboard` (antes mostraban error)
2. Auth check ocurre en servidor (mas seguro, no depende de hidratacion)
3. Patron consistente con `[childId]/page.tsx` que ya era server component

## Prevencion

### Regla para paginas nuevas admin-only

Al crear paginas nuevas que requieren verificacion de rol:

1. **PREFERIR server component** con `getServerSession()` para auth checks
2. **Extraer a client component** solo la logica que necesita hooks de cliente
3. **NO usar `useSession()` para auth gating** — usar solo para datos reactivos de sesion
   que ya se sabe que existen (ej: mostrar nombre del usuario en un componente interior)

### Patron recomendado para rutas admin-only

```
pagina/
├── page.tsx              ← Server component: getServerSession + redirect
├── PageClient.tsx        ← Client component: hooks de UI (useActiveChild, useRouter)
└── [childId]/
    └── page.tsx          ← Server component: getServerSession + render client
```

### Ejemplo de referencia que ya funciona

- `app/dashboard/diagnosticos/[childId]/page.tsx` — server component con getServerSession
- `app/dashboard/patients/page.tsx` — server component con getServerSession

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `app/dashboard/diagnosticos/page.tsx` | Convertido de client a server component |
| `app/dashboard/diagnosticos/DiagnosticosClient.tsx` | Nuevo: logica client extraida |

## Diagnostico — Proceso de Investigacion

### Pistas clave

1. Mensaje "Ups! Algo salio mal" viene de `components/ErrorBoundary.tsx:54`
2. ErrorBoundary envuelve `{children}` en `app/dashboard/layout.tsx:47-52`
3. El error es TypeError en rendering (no en API call ni event handler)
4. El build pasa por `ignoreBuildErrors: true` en next.config.mjs

### Herramientas de debug usadas

- `npm run type-check` — revelo errores TS2322 en API de diagnosticos (no relacionado al crash)
- `npm run build` — paso exitosamente, ambas rutas generadas
- Console del navegador en Vercel QA — revelo el TypeError exacto
- Grep de "Algo salio mal" — identifico el ErrorBoundary como fuente del mensaje

### Red herrings descartados

- TypeScript type mismatch en API (`WithId<Document>[]` vs `SleepEvent[]`) — causa un 500 en la API
  pero NO el crash del ErrorBoundary. Es un bug separado.
- Collection name `child_plans` — correcto, consistente en todo el codebase
- Componentes de diagnostic faltantes — todos existen y compilan
- Middleware bloqueando la ruta — no hay middleware custom
- Version de next-auth — `"latest"` resuelve a v4.24.x (estable)
