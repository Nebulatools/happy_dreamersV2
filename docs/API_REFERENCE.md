# 📡 API Reference - Happy Dreamers

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Autenticación](#autenticación)
- [Endpoints](#endpoints)
  - [Auth API](#auth-api)
  - [Children API](#children-api)
  - [Events API](#events-api)
  - [Consultas API](#consultas-api)
  - [RAG API](#rag-api)
  - [Admin API](#admin-api)
- [Modelos de Datos](#modelos-de-datos)
- [Códigos de Error](#códigos-de-error)
- [Rate Limiting](#rate-limiting)

## 🎯 Visión General

La API de Happy Dreamers sigue principios RESTful y utiliza JSON para request/response. Todos los endpoints requieren autenticación excepto los de registro y login.

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Headers Comunes
```http
Content-Type: application/json
Authorization: Bearer {token}
```

### Formato de Respuesta
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

## 🔐 Autenticación

Happy Dreamers utiliza NextAuth.js con JWT para autenticación.

### Flujo de Autenticación
1. Usuario se registra o hace login
2. Sistema genera JWT token
3. Cliente incluye token en headers
4. API valida token en cada request

## 📚 Endpoints

### Auth API

#### POST /api/auth/register
Registra un nuevo usuario.

**Request:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "SecurePassword123!",
  "role": "parent"  // Optional: "parent" | "admin" | "professional"
}
```

**Response (201):**
```json
{
  "message": "Usuario registrado correctamente",
  "userId": "507f1f77bcf86cd799439011"
}
```

**Errors:**
- `400`: Datos faltantes o inválidos
- `409`: Email ya registrado

#### POST /api/auth/[...nextauth]
Maneja login/logout via NextAuth.

**Login Request:**
```json
{
  "email": "juan@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "role": "parent"
  },
  "expires": "2024-12-31T23:59:59.999Z"
}
```

### Children API

#### GET /api/children
Obtiene todos los niños del usuario autenticado.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "firstName": "María",
        "lastName": "Pérez",
        "birthDate": "2020-05-15",
        "parentId": "507f1f77bcf86cd799439012",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "surveyData": {}
      }
    ]
  }
}
```

#### GET /api/children?id={childId}
Obtiene un niño específico.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "María",
    "lastName": "Pérez",
    "birthDate": "2020-05-15",
    "parentId": "507f1f77bcf86cd799439012",
    "surveyData": {
      "completedAt": "2024-01-15T10:30:00.000Z",
      "informacionFamiliar": {},
      "dinamicaFamiliar": {},
      "historial": {},
      "desarrolloSalud": {},
      "actividadFisica": {},
      "rutinaHabitos": {}
    }
  }
}
```

#### POST /api/children
Crea un nuevo niño.

**Request:**
```json
{
  "firstName": "Carlos",
  "lastName": "Pérez",
  "birthDate": "2021-03-20",
  "surveyData": {
    // Datos opcionales de la encuesta
  }
}
```

**Response (201):**
```json
{
  "message": "Niño registrado correctamente",
  "id": "507f1f77bcf86cd799439013",
  "userUpdated": true
}
```

#### PUT /api/children
Actualiza información de un niño.

**Request:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "firstName": "Carlos Alberto",
  "lastName": "Pérez García",
  "birthDate": "2021-03-20",
  "surveyData": {
    // Actualización de encuesta
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Información del niño actualizada correctamente",
    "updated": true
  }
}
```

#### DELETE /api/children?id={childId}
Elimina un niño.

**Response (200):**
```json
{
  "message": "Niño eliminado correctamente"
}
```

### Events API (Sistema v5.0)

#### GET /api/children/events?childId={childId}
Obtiene todos los eventos de un niño (sueño, alimentación, medicamentos, actividades).

**Query Parameters:**
- `childId` (required): ID del niño
- `startDate` (optional): Fecha inicio (ISO)
- `endDate` (optional): Fecha fin (ISO)
- `eventType` (optional): Tipo de evento

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "firstName": "María",
  "lastName": "Pérez",
  "events": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "childId": "507f1f77bcf86cd799439011",
      "eventType": "sleep",
      "startTime": "2024-01-20T22:00:00.000Z",
      "endTime": "2024-01-21T07:00:00.000Z",
      "duration": 480,
      "emotionalState": "tranquilo",
      "sleepDelay": 15,
      "notes": "Se durmió sin problemas"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "eventType": "feeding",
      "startTime": "2024-01-21T08:00:00.000Z",
      "feedingType": "solids",
      "feedingAmount": 200,
      "feedingDuration": 20,
      "babyState": "awake",
      "feedingNotes": "Desayuno completo"
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "eventType": "medication",
      "startTime": "2024-01-21T09:00:00.000Z",
      "medicationName": "Ibuprofeno",
      "medicationDose": "5ml",
      "medicationTime": "09:00",
      "medicationNotes": "Para fiebre"
    },
    {
      "_id": "507f1f77bcf86cd799439017",
      "eventType": "extra_activities",
      "startTime": "2024-01-21T10:00:00.000Z",
      "activityDescription": "Juego en el parque",
      "activityDuration": 60,
      "activityImpact": "positive",
      "activityNotes": "Mucha energía gastada"
    }
  ]
}
```

#### POST /api/children/events
Registra un nuevo evento (sueño, alimentación, medicamento o actividad).

**Request para Sueño:**
```json
{
  "childId": "507f1f77bcf86cd799439011",
  "eventType": "sleep",
  "startTime": "2024-01-20T22:00:00.000Z",
  "emotionalState": "tranquilo",
  "sleepDelay": 20,
  "notes": "Se durmió después del cuento"
}
```

**Request para Alimentación:**
```json
{
  "childId": "507f1f77bcf86cd799439011",
  "eventType": "feeding",
  "startTime": "2024-01-21T12:00:00.000Z",
  "feedingType": "bottle",
  "feedingAmount": 180,
  "feedingDuration": 15,
  "babyState": "awake",
  "feedingNotes": "Tomó toda la leche"
}
```

**Request para Medicamento (v5.0):**
```json
{
  "childId": "507f1f77bcf86cd799439011",
  "eventType": "medication",
  "startTime": "2024-01-21T09:00:00.000Z",
  "medicationName": "Paracetamol",
  "medicationDose": "10ml",
  "medicationTime": "09:00",
  "medicationNotes": "Para dolor de cabeza"
}
```

**Request para Actividad Extra (v5.0):**
```json
{
  "childId": "507f1f77bcf86cd799439011",
  "eventType": "extra_activities",
  "startTime": "2024-01-21T16:00:00.000Z",
  "activityDescription": "Clase de natación",
  "activityDuration": 45,
  "activityImpact": "positive",
  "activityNotes": "Muy cansado después"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Evento registrado correctamente",
  "eventId": "507f1f77bcf86cd799439015"
}
```

#### PUT /api/children/events/{id}
Actualiza un evento existente.

**Request:**
```json
{
  "duration": 510,
  "quality": "EXCELLENT",
  "notes": "Durmió toda la noche"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Evento actualizado correctamente"
}
```

#### DELETE /api/children/events/{id}
Elimina un evento.

**Response (200):**
```json
{
  "success": true,
  "message": "Evento eliminado correctamente"
}
```

### Consultas API

#### POST /api/consultas/analyze
Analiza datos de sueño con IA.

**Request:**
```json
{
  "childId": "507f1f77bcf86cd799439011",
  "transcript": "Mi hijo de 3 años se despierta varias veces...",
  "period": "LAST_30_DAYS"
}
```

**Response (200):**
```json
{
  "success": true,
  "analysis": {
    "summary": "Análisis del patrón de sueño",
    "patterns": [
      {
        "type": "FREQUENT_WAKING",
        "frequency": "3-4 veces por noche",
        "possibleCauses": ["Ansiedad", "Cambios en rutina"]
      }
    ],
    "recommendations": [
      "Establecer rutina consistente",
      "Reducir estímulos antes de dormir"
    ],
    "confidenceScore": 0.85
  }
}
```

#### GET /api/consultas/history
Obtiene historial de consultas.

**Query Parameters:**
- `childId` (required): ID del niño
- `limit` (optional): Número de resultados (default: 10)

**Response (200):**
```json
{
  "success": true,
  "consultations": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "childId": "507f1f77bcf86cd799439011",
      "date": "2024-01-15T10:00:00.000Z",
      "type": "AI_ANALYSIS",
      "summary": "Análisis de patrones de sueño",
      "recommendations": []
    }
  ]
}
```

#### POST /api/consultas/plans
Genera plan de acción personalizado.

**Request:**
```json
{
  "childId": "507f1f77bcf86cd799439011",
  "analysisId": "507f1f77bcf86cd799439016",
  "goals": ["Reducir despertares", "Mejorar calidad de sueño"]
}
```

**Response (200):**
```json
{
  "success": true,
  "plan": {
    "duration": "4 semanas",
    "phases": [
      {
        "week": 1,
        "focus": "Establecer rutina",
        "actions": [
          "Hora fija de dormir",
          "Ritual de 30 minutos"
        ]
      }
    ],
    "expectedOutcomes": [
      "50% reducción en despertares"
    ]
  }
}
```

### RAG API

#### POST /api/rag/upload
Sube documentos al sistema RAG.

**Request (multipart/form-data):**
```
file: [archivo.pdf]
metadata: {
  "title": "Guía de sueño infantil",
  "category": "educational"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Documento procesado correctamente",
  "documentId": "507f1f77bcf86cd799439017"
}
```

#### GET /api/rag/documents
Lista documentos en el sistema RAG.

**Response (200):**
```json
{
  "success": true,
  "documents": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "title": "Guía de sueño infantil",
      "uploadedAt": "2024-01-10T15:00:00.000Z",
      "category": "educational",
      "chunks": 42
    }
  ]
}
```

#### POST /api/rag/chat
Chat con el sistema RAG.

**Request:**
```json
{
  "message": "¿Cuáles son las técnicas para mejorar el sueño?",
  "childId": "507f1f77bcf86cd799439011",
  "includeContext": true
}
```

**Response (200):**
```json
{
  "success": true,
  "response": "Basándome en la información disponible...",
  "sources": [
    {
      "document": "Guía de sueño infantil",
      "relevance": 0.92
    }
  ]
}
```

### Admin API

#### GET /api/admin/users
Obtiene lista de usuarios (solo admin).

**Query Parameters:**
- `role` (optional): Filtrar por rol
- `page` (optional): Página (default: 1)
- `limit` (optional): Resultados por página (default: 20)

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "juan@example.com",
      "name": "Juan Pérez",
      "role": "parent",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "childrenCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "totalUsers": 100
  }
}
```

#### GET /api/admin/reports
Genera reportes del sistema (solo admin).

**Query Parameters:**
- `type`: "usage" | "sleep_patterns" | "consultations"
- `startDate`: Fecha inicio (ISO)
- `endDate`: Fecha fin (ISO)

**Response (200):**
```json
{
  "success": true,
  "report": {
    "type": "usage",
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "metrics": {
      "totalUsers": 150,
      "activeUsers": 120,
      "totalEvents": 3500,
      "avgEventsPerUser": 29.2
    },
    "trends": {
      "userGrowth": "+15%",
      "eventGrowth": "+22%"
    }
  }
}
```

## 📊 Modelos de Datos

### User Model
```typescript
interface User {
  _id: string
  email: string
  name: string
  password?: string  // Never returned in responses
  role: "parent" | "admin" | "professional"
  children?: string[]
  createdAt: Date
  updatedAt: Date
}
```

### Child Model
```typescript
interface Child {
  _id: string
  firstName: string
  lastName: string
  birthDate: string
  parentId: string
  surveyData?: SurveyData
  events?: Event[]
  createdAt: Date
  updatedAt: Date
}
```

### Event Model
```typescript
interface Event {
  _id: string
  childId: string
  type: "NIGHT_SLEEP" | "NAP" | "NIGHT_WAKING"
  timestamp: Date
  duration: number  // minutos
  emotionalState: EmotionalState
  quality?: "POOR" | "FAIR" | "GOOD" | "EXCELLENT"
  notes?: string
  extraActivities?: string[]
}

type EmotionalState = 
  | "CALM"
  | "HAPPY"
  | "ANXIOUS"
  | "IRRITABLE"
  | "SAD"
  | "ENERGETIC"
  | "TIRED"
  | "FRUSTRATED"
```

### Survey Data Model
```typescript
interface SurveyData {
  completedAt?: Date
  informacionFamiliar: {
    papa: ParentInfo
    mama: ParentInfo
  }
  dinamicaFamiliar: FamilyDynamics
  historial: ChildHistory
  desarrolloSalud: HealthDevelopment
  actividadFisica: PhysicalActivity
  rutinaHabitos: RoutineHabits
}
```

## 🚨 Códigos de Error

### Códigos HTTP Estándar
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

### Tipos de Error Personalizados
```typescript
enum ApiErrorType {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR"
}
```

### Formato de Error
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "El campo 'firstName' es requerido",
  "details": {
    "field": "firstName",
    "constraint": "required"
  }
}
```

## ⚡ Rate Limiting

**Nota:** Rate limiting está planeado pero aún no implementado.

### Límites Planeados
- **Autenticación**: 5 intentos por minuto
- **API General**: 100 requests por minuto
- **IA/Chat**: 10 requests por minuto
- **Upload**: 5 archivos por hora

### Headers de Rate Limit
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🔄 Webhooks (Futuro)

Planeado para notificaciones en tiempo real:
- Nuevos eventos de sueño
- Análisis completados
- Alertas de patrones

## 📝 Notas de Implementación

### Validación
Todos los endpoints utilizan Zod para validación de esquemas:
```typescript
const eventSchema = z.object({
  childId: z.string(),
  type: z.enum(["NIGHT_SLEEP", "NAP", "NIGHT_WAKING"]),
  timestamp: z.string().datetime(),
  duration: z.number().positive(),
  emotionalState: z.enum(EMOTIONAL_STATES)
})
```

### Manejo de Errores
Wrapper unificado para todos los endpoints:
```typescript
export const handler = withErrorHandler(async (req) => {
  // Lógica del endpoint
})
```

### Logging
Sistema de logging con namespaces:
```typescript
const logger = createLogger("API:Children")
logger.info("Child created", { childId })
```

---

**Última actualización:** Enero 2024  
**Versión API:** 1.0.0