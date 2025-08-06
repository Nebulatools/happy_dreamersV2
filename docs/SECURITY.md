# = Gu�a de Seguridad - Happy Dreamers

## =� Tabla de Contenidos

- [Principios de Seguridad](#principios-de-seguridad)
- [Autenticaci�n y Autorizaci�n](#autenticaci�n-y-autorizaci�n)
- [Protecci�n de Datos](#protecci�n-de-datos)
- [Seguridad de API](#seguridad-de-api)
- [Seguridad Frontend](#seguridad-frontend)
- [Manejo de Secretos](#manejo-de-secretos)
- [Auditor�a de Seguridad](#auditor�a-de-seguridad)
- [Respuesta a Incidentes](#respuesta-a-incidentes)
- [Compliance](#compliance)

## <� Principios de Seguridad

### Defense in Depth
M�ltiples capas de seguridad:
1. **Perimeter Security**: Firewall, DDoS protection
2. **Application Security**: Authentication, authorization
3. **Data Security**: Encryption, access control
4. **Monitoring**: Logging, alerting, audit trails

### Zero Trust
- Nunca confiar, siempre verificar
- M�nimos privilegios necesarios
- Segmentaci�n de acceso
- Verificaci�n continua

### Secure by Default
- Configuraciones seguras por defecto
- Opt-in para funcionalidades riesgosas
- Fail securely

## = Autenticaci�n y Autorizaci�n

### NextAuth.js Configuration

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Validaci�n de credenciales
        const user = await validateUser(credentials)
        
        // Rate limiting
        await checkRateLimit(credentials.email)
        
        // Verificaci�n de password
        const valid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )
        
        if (!valid) {
          // Log intento fallido
          await logFailedAttempt(credentials.email)
          return null
        }
        
        return user
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 d�as
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session: async ({ session, token }) => {
      session.user.role = token.role
      session.user.id = token.id
      return session
    }
  }
}
```

### Password Security

```typescript
// Hashing con bcrypt
const saltRounds = 12
const hashedPassword = await bcrypt.hash(password, saltRounds)

// Validaci�n de fortaleza
function validatePasswordStrength(password: string) {
  const requirements = [
    { regex: /.{8,}/, message: "M�nimo 8 caracteres" },
    { regex: /[A-Z]/, message: "Una may�scula" },
    { regex: /[a-z]/, message: "Una min�scula" },
    { regex: /[0-9]/, message: "Un n�mero" },
    { regex: /[^A-Za-z0-9]/, message: "Un car�cter especial" }
  ]
  
  return requirements.every(req => req.regex.test(password))
}
```

### Role-Based Access Control (RBAC)

```typescript
// Middleware de autorizaci�n
export function requireRole(roles: string[]) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions)
    
    if (!session || !roles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      )
    }
  }
}

// Uso en API routes
export const GET = requireRole(["admin", "professional"])(
  async (req) => {
    // L�gica del endpoint
  }
)
```

## = Protecci�n de Datos

### Datos Sensibles de Ni�os

```typescript
// Principios COPPA/GDPR para menores
interface ChildDataProtection {
  // Nunca exponer
  never_expose: [
    "full_address",
    "medical_records",
    "location_data",
    "biometric_data"
  ]
  
  // Requerir consentimiento parental
  parental_consent_required: true
  
  // Anonimizaci�n en logs
  anonymize_in_logs: true
  
  // Retenci�n limitada
  retention_period: "3_years"
}
```

### Encriptaci�n

```typescript
// Encriptaci�n en tr�nsito
// HTTPS obligatorio en producci�n
if (process.env.NODE_ENV === "production") {
  app.use(enforceHTTPS())
}

// Encriptaci�n en reposo (MongoDB)
// Configurar en MongoDB Atlas:
{
  "encryptionAtRest": {
    "enabled": true,
    "kmsProvider": "AWS"
  }
}

// Encriptaci�n de campos sensibles
import crypto from "crypto"

function encryptSensitiveData(text: string) {
  const algorithm = "aes-256-gcm"
  const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex")
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex")
  }
}
```

### Data Isolation

```typescript
// Aislamiento de datos por familia
export async function getChildData(childId: string, userId: string) {
  const child = await db.collection("children").findOne({
    _id: ObjectId(childId),
    parentId: userId  // Verificar propiedad
  })
  
  if (!child) {
    throw new ForbiddenError("No autorizado")
  }
  
  return child
}
```

## < Seguridad de API

### Input Validation

```typescript
// Validaci�n con Zod
import { z } from "zod"

const eventSchema = z.object({
  childId: z.string().regex(/^[a-f0-9]{24}$/),  // ObjectId v�lido
  type: z.enum(["NIGHT_SLEEP", "NAP", "NIGHT_WAKING"]),
  timestamp: z.string().datetime(),
  duration: z.number().positive().max(1440),  // M�x 24 horas
  notes: z.string().max(500).optional()
})

// Sanitizaci�n de entrada
function sanitizeInput(input: string) {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
}
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { LRUCache } from "lru-cache"

const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 60000  // 1 minuto
})

export async function rateLimit(
  identifier: string,
  limit: number = 10
) {
  const count = rateLimitCache.get(identifier) || 0
  
  if (count >= limit) {
    throw new TooManyRequestsError(
      "L�mite de solicitudes excedido"
    )
  }
  
  rateLimitCache.set(identifier, count + 1)
}

// Uso en API route
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  await rateLimit(ip, 5)  // 5 requests por minuto
  
  // L�gica del endpoint
}
```

### CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.FRONTEND_URL },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ]
  },
}
```

## =� Seguridad Frontend

### XSS Prevention

```tsx
//  Seguro: React escapa autom�ticamente
<div>{userInput}</div>

// � Peligroso: Solo con contenido confiable
<div dangerouslySetInnerHTML={{ __html: trustedHTML }} />

// Sanitizaci�n si es necesario
import DOMPurify from "dompurify"

const cleanHTML = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "p"],
  ALLOWED_ATTR: []
})
```

### Content Security Policy

```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, "")
          }
        ]
      }
    ]
  }
}
```

### Secure Storage

```typescript
// L Nunca guardar datos sensibles en localStorage
localStorage.setItem("apiKey", apiKey)  // MAL

//  Usar httpOnly cookies para tokens
// En el servidor:
response.cookies.set("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 60 * 60 * 24 * 30,
  path: "/"
})

//  Para datos no sensibles, encriptar
function secureStorage() {
  return {
    setItem: (key: string, value: any) => {
      const encrypted = encrypt(JSON.stringify(value))
      localStorage.setItem(key, encrypted)
    },
    getItem: (key: string) => {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      return JSON.parse(decrypt(encrypted))
    }
  }
}
```

## = Manejo de Secretos

### Environment Variables

```bash
# .env.local (nunca commitear)
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=generated-secret-key
OPENAI_API_KEY=sk-...
ENCRYPTION_KEY=hex-encoded-32-byte-key
```

### Generaci�n de Secretos

```bash
# Generar NEXTAUTH_SECRET
openssl rand -base64 32

# Generar ENCRYPTION_KEY
openssl rand -hex 32
```

### Rotaci�n de Claves

```typescript
// Proceso de rotaci�n
1. Generar nueva clave
2. Actualizar en variables de entorno
3. Re-encriptar datos sensibles
4. Verificar funcionamiento
5. Eliminar clave antigua

// Script de rotaci�n
async function rotateEncryptionKeys() {
  const oldKey = process.env.OLD_ENCRYPTION_KEY
  const newKey = process.env.NEW_ENCRYPTION_KEY
  
  // Re-encriptar todos los datos
  const documents = await db.collection("sensitive").find({})
  
  for (const doc of documents) {
    const decrypted = decrypt(doc.data, oldKey)
    const reencrypted = encrypt(decrypted, newKey)
    
    await db.collection("sensitive").updateOne(
      { _id: doc._id },
      { $set: { data: reencrypted } }
    )
  }
}
```

## = Auditor�a de Seguridad

### Logging de Seguridad

```typescript
// lib/security-logger.ts
interface SecurityEvent {
  type: "AUTH_FAILURE" | "UNAUTHORIZED_ACCESS" | "DATA_BREACH" | "SUSPICIOUS_ACTIVITY"
  userId?: string
  ip: string
  userAgent: string
  timestamp: Date
  details: any
}

export async function logSecurityEvent(event: SecurityEvent) {
  // Log local
  logger.warn("SECURITY_EVENT", event)
  
  // Guardar en DB
  await db.collection("security_logs").insertOne(event)
  
  // Alertas cr�ticas
  if (event.type === "DATA_BREACH") {
    await sendSecurityAlert(event)
  }
}
```

### Checklist de Auditor�a

```markdown
## Auditor�a Mensual

### Accesos
- [ ] Revisar logs de autenticaci�n
- [ ] Verificar intentos fallidos
- [ ] Auditar permisos de usuarios
- [ ] Revisar tokens activos

### Datos
- [ ] Verificar encriptaci�n
- [ ] Revisar accesos a datos sensibles
- [ ] Validar backups
- [ ] Verificar retenci�n de datos

### C�digo
- [ ] Escanear vulnerabilidades (npm audit)
- [ ] Revisar dependencias
- [ ] Verificar configuraciones
- [ ] Revisar c�digo nuevo

### Infraestructura
- [ ] Verificar certificados SSL
- [ ] Revisar configuraci�n de firewall
- [ ] Verificar parches de seguridad
- [ ] Revisar logs de sistema
```

## =� Respuesta a Incidentes

### Plan de Respuesta

```typescript
interface IncidentResponse {
  1_detection: {
    monitoring: "24/7 automated",
    alerts: ["email", "sms", "slack"],
    escalation: "automatic"
  },
  
  2_containment: {
    immediate: [
      "Aislar sistema afectado",
      "Deshabilitar cuentas comprometidas",
      "Bloquear IPs sospechosas"
    ],
    assessment: "Evaluar alcance del incidente"
  },
  
  3_eradication: {
    actions: [
      "Eliminar malware/acceso no autorizado",
      "Parchear vulnerabilidades",
      "Actualizar sistemas"
    ]
  },
  
  4_recovery: {
    steps: [
      "Restaurar desde backups limpios",
      "Verificar integridad",
      "Monitoreo aumentado"
    ]
  },
  
  5_lessons_learned: {
    documentation: "Documentar incidente completo",
    improvements: "Implementar mejoras",
    training: "Actualizar entrenamiento"
  }
}
```

## =� Compliance

### GDPR / COPPA

```typescript
// Consentimiento parental
interface ParentalConsent {
  childId: string
  parentId: string
  consentDate: Date
  consentType: "data_collection" | "data_processing" | "data_sharing"
  ipAddress: string
  withdrawn: boolean
}

// Derecho al olvido
export async function deleteChildData(childId: string, parentId: string) {
  // Verificar autorizaci�n parental
  await verifyParentalAuthority(childId, parentId)
  
  // Eliminar datos
  await db.collection("children").deleteOne({ _id: childId })
  await db.collection("events").deleteMany({ childId })
  await db.collection("consultations").deleteMany({ childId })
  
  // Log de cumplimiento
  await logCompliance({
    action: "RIGHT_TO_BE_FORGOTTEN",
    childId,
    parentId,
    timestamp: new Date()
  })
}

// Portabilidad de datos
export async function exportChildData(childId: string) {
  const data = {
    child: await db.collection("children").findOne({ _id: childId }),
    events: await db.collection("events").find({ childId }).toArray(),
    consultations: await db.collection("consultations").find({ childId }).toArray()
  }
  
  return {
    format: "json",
    data,
    exportDate: new Date(),
    dataSubject: childId
  }
}
```

### Pol�tica de Privacidad

Actualizar regularmente:
- Qu� datos recolectamos
- C�mo los usamos
- Con qui�n los compartimos
- C�mo los protegemos
- Derechos de los usuarios
- Contacto DPO

---

**�ltima actualizaci�n:** Enero 2024  
**Versi�n:** 1.0.0  
**Contacto de Seguridad:** security@happydreamers.com