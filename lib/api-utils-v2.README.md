# Sistema de API Utils V2 - Happy Dreamers

Sistema mejorado de utilidades para API Routes con estandarización de respuestas, validación robusta y manejo de errores consistente.

## 📋 Contenido

- `api-utils-v2.ts`: Sistema principal de respuestas y errores
- `api-middleware.ts`: Middleware de validación y procesamiento
- Ejemplo completo en `/app/api/children/v2/route.ts`

## 🚀 Características Principales

### 1. Respuestas Estandarizadas

Todas las respuestas siguen el formato:

```typescript
{
  success: boolean,
  data?: T,
  error?: {
    code: string,
    message: string,
    type: string,
    details?: object,
    field?: string
  },
  message?: string,
  meta: {
    timestamp: string,
    version: string,
    requestId: string,
    processingTime?: number
  },
  pagination?: {
    page: number,
    pageSize: number,
    totalPages: number,
    totalItems: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}
```

### 2. Sistema de Errores Mejorado

```typescript
// Tipos de error disponibles
enum ApiErrorType {
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  VALIDATION_ERROR,
  INTERNAL_ERROR,
  RATE_LIMIT_EXCEEDED,
  // ... y más
}

// Cada error tiene:
- Código único (ej: "ERR_AUTH_001")
- Mensaje en español
- Status HTTP apropiado
- Detalles opcionales
```

### 3. Validación con Zod

```typescript
const schema = z.object({
  name: z.string().min(1).max(50),
  age: z.number().min(0).max(120),
  email: z.string().email()
})

const { body } = await validateRequestData(request, schema)
```

### 4. Rate Limiting

```typescript
await checkRateLimitV2(
  userId,     // identificador
  100,        // límite de requests
  60000       // ventana de tiempo (1 minuto)
)
```

## 🎯 Uso Básico

### Crear un Endpoint GET

```typescript
import { withErrorHandlerV2, createSuccessResponseV2, requireAuthV2 } from "@/lib/api-utils-v2"

export const GET = withErrorHandlerV2(async (request: NextRequest) => {
  // 1. Autenticación
  const session = await requireAuthV2()
  
  // 2. Tu lógica
  const data = await fetchData()
  
  // 3. Respuesta estandarizada
  return createSuccessResponseV2(
    data,
    "Datos obtenidos exitosamente"
  )
})
```

### Crear un Endpoint POST con Validación

```typescript
import { postMiddleware } from "@/lib/api-middleware"
import { z } from "zod"

// Schema de validación
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18)
})

export const POST = withErrorHandlerV2(async (request: NextRequest) => {
  // 1. Validación automática
  const { body } = await postMiddleware(createUserSchema)(request)
  
  // 2. Autenticación
  const session = await requireAuthV2()
  
  // 3. Lógica de negocio
  const newUser = await createUser(body)
  
  // 4. Respuesta
  return createSuccessResponseV2(
    newUser,
    "Usuario creado exitosamente",
    undefined,
    Date.now() - startTime // tiempo de procesamiento
  )
})
```

### Manejo de Errores

```typescript
// Lanzar errores específicos
throw new ApiErrorV2(
  ApiErrorType.NOT_FOUND,
  "Usuario no encontrado",
  { userId: id }  // detalles adicionales
)

// Error de validación con campo específico
throw new ApiErrorV2(
  ApiErrorType.VALIDATION_ERROR,
  "Email inválido",
  { format: "email" },
  "email"  // campo específico
)

// Error de negocio
throw new ApiErrorV2(
  ApiErrorType.BUSINESS_RULE_VIOLATION,
  "No puedes realizar esta acción",
  { reason: "insufficient_balance", required: 100, current: 50 }
)
```

## 📐 Middleware Avanzado

### Configuración Completa

```typescript
const middleware = createApiMiddleware({
  // Métodos permitidos
  allowedMethods: ["GET", "POST"],
  
  // Validación de body
  validateBody: userSchema,
  
  // Validación de query params
  validateQuery: z.object({
    page: z.coerce.number().min(1),
    search: z.string().optional()
  }),
  
  // Validación de route params
  validateParams: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/)
  }),
  
  // Sanitización HTML
  sanitizeHtml: true,
  
  // Tamaño máximo del body
  maxBodySize: 1024 * 1024, // 1MB
  
  // Rate limiting
  rateLimitConfig: {
    enabled: true,
    limit: 50,
    windowMs: 60000,
    identifier: (req) => req.headers.get("x-user-id") || "anonymous"
  },
  
  // Validadores personalizados
  customValidators: [
    async (req) => {
      // Tu validación personalizada
      if (someCondition) {
        throw new ApiErrorV2(ApiErrorType.FORBIDDEN, "No permitido")
      }
    }
  ]
})
```

### Middlewares Pre-configurados

```typescript
// GET endpoint
const { query } = await getMiddleware(request)

// POST endpoint con schema
const { body } = await postMiddleware(schema)(request)

// PUT/PATCH endpoint
const { body } = await updateMiddleware(schema)(request)

// DELETE endpoint
await deleteMiddleware(request)
```

## 🎨 Paginación

```typescript
// Parsear parámetros de paginación
const { page, pageSize, skip } = parsePaginationParams(searchParams)

// Ejecutar query con paginación
const [items, total] = await Promise.all([
  db.collection("items")
    .find(query)
    .skip(skip)
    .limit(pageSize)
    .toArray(),
  db.collection("items").countDocuments(query)
])

// Crear metadata
const pagination = createPaginationMeta(page, pageSize, total)

// Incluir en respuesta
return createSuccessResponseV2(items, "Items obtenidos", pagination)
```

## 🔒 Autorización por Roles

```typescript
// Requiere rol específico
const session = await requireRoleV2("admin")

// Múltiples roles permitidos
const session = await requireRoleV2(["admin", "moderator"])
```

## 📊 Logging y Métricas

El sistema automáticamente:
- Genera IDs únicos para cada request
- Registra tiempo de procesamiento
- Loggea errores con contexto completo
- Agrega headers de tracking

```typescript
// Headers agregados automáticamente:
X-Request-Id: req_1234567890_abc123def
X-Processing-Time: 145ms
```

## 🔄 Migración desde V1

### Antes (V1):
```typescript
return NextResponse.json({ data }, { status: 200 })
return NextResponse.json({ error: "Error" }, { status: 500 })
```

### Después (V2):
```typescript
return createSuccessResponseV2(data, "Éxito")
throw new ApiErrorV2(ApiErrorType.INTERNAL_ERROR, "Error")
```

## 📝 Schemas Comunes

```typescript
import { commonSchemas } from "@/lib/api-utils-v2"

// MongoDB ID
commonSchemas.mongoId

// Paginación
commonSchemas.pagination

// Rango de fechas
commonSchemas.dateRange

// Ordenamiento
commonSchemas.sorting
```

## 🚨 Mejores Prácticas

1. **Siempre usa withErrorHandlerV2** en tus endpoints
2. **Valida todos los inputs** con schemas Zod
3. **Lanza errores específicos** con ApiErrorV2
4. **Incluye metadata útil** en los errores
5. **Usa los middlewares pre-configurados** cuando sea posible
6. **Implementa paginación** para listas grandes
7. **Sanitiza inputs** cuando manejes HTML
8. **Documenta tus schemas** de validación

## 🔍 Debugging

En desarrollo, los errores incluyen stack traces:

```json
{
  "error": {
    "code": "ERR_SRV_001",
    "message": "Error interno",
    "stack": "Error: ...\n  at function..."
  }
}
```

## 📚 Ejemplos Adicionales

Ver `/app/api/children/v2/route.ts` para un ejemplo completo de:
- GET con paginación y filtros
- POST con validación completa
- PATCH con validadores personalizados
- Manejo de errores de negocio
- Rate limiting
- Logging estructurado