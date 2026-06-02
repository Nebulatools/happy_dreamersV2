# Integración Yose → Happy Dreamers API

Guía para conectar **Yose** (asistente WhatsApp/Telegram/iOS) con el **API público de Happy Dreamers**.
Del lado de Happy Dreamers **no hay que cambiar nada** — el API ya está en producción. Todo lo de abajo
se implementa/configura **dentro de Yose**.

---

## 1. Lo esencial

| Dato | Valor |
|------|-------|
| **Base URL (producción)** | `https://happy-dreamers-v2.vercel.app/api/v1` |
| **Auth** | Header `Authorization: Bearer hd_live_...` |
| **Contrato OpenAPI** | `GET https://happy-dreamers-v2.vercel.app/api/v1/openapi.json` |
| **Formato éxito** | `{ "data": ... }` |
| **Formato error** | `{ "error": { "code": "...", "message": "..." } }` |

### Cómo se obtiene una API key
**Cualquier usuario** de Happy Dreamers la genera él mismo (no requiere admin):
1. Inicia sesión en `https://happy-dreamers-v2.vercel.app`
2. **Configuración → API / Desarrolladores → Crear API key**
3. Elige **scopes** y (opcional) limita a ciertos niños
4. **Copia el secreto** — se muestra una sola vez (en BD solo se guarda su hash sha256)

La key actúa **en nombre de ese usuario**: solo ve/edita los niños de ese usuario, y solo lo que sus scopes permiten.

### Scopes
| Scope | Permite |
|-------|---------|
| `children:read` | Listar y leer niños |
| `events:read` | Leer eventos |
| `events:write` | Crear, editar y eliminar eventos |
| `stats:read` | Leer estadísticas de sueño |
| `notifications:read` | Leer notificaciones |
| `notifications:write` | Crear/programar notificaciones |

**Rate limit:** 120 req/min por key (con control de ráfaga). Si se excede → HTTP 429.

---

## 2. Endpoints (lo que Yose va a llamar)

> Reemplaza `$B` = `https://happy-dreamers-v2.vercel.app/api/v1` y `$K` = la API key del usuario.

### Identidad y niños
```bash
# Descubrir el usuario y sus niños (para obtener childId)
curl -H "Authorization: Bearer $K" "$B/me"
curl -H "Authorization: Bearer $K" "$B/children"           # scope: children:read
curl -H "Authorization: Bearer $K" "$B/children/{id}/sleep-state"
```

### Eventos (el caso de uso principal de Yose)
```bash
# Listar eventos de un niño
curl -H "Authorization: Bearer $K" "$B/events?childId=CHILD_ID"      # events:read

# Registrar un evento (sleep/nap/wake/night_waking/feeding/medication/extra_activities/note)
curl -X POST "$B/events" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{
  "childId": "CHILD_ID",
  "eventType": "sleep",
  "startTime": "2026-06-01T20:30:00-06:00",
  "endTime":   "2026-06-02T07:00:00-06:00",
  "sleepDelay": 15,
  "emotionalState": "tranquilo"
}'                                                                   # events:write

# Editar (parcial; o completo si incluye eventType). Requiere childId en el body
curl -X PATCH "$B/events/EVENT_ID" -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
  -d '{ "childId": "CHILD_ID", "endTime": "2026-06-02T07:30:00-06:00" }'

# Eliminar
curl -X DELETE "$B/events/EVENT_ID?childId=CHILD_ID" -H "Authorization: Bearer $K"
```

**Fechas:** usa ISO 8601 **con offset** (ej. `-06:00`). Así el evento cae en el día correcto y se clasifica noche/siesta bien.

**Alimentación nocturna:** NO es un tipo aparte; usa `feeding` con el flag:
```json
{ "childId":"CHILD_ID", "eventType":"feeding", "feedingType":"bottle",
  "babyState":"asleep", "isNightFeeding":true, "feedingAmount":120,
  "startTime":"2026-06-02T02:10:00-06:00" }
```

Campos por tipo:
- `sleep` / `nap`: `sleepDelay` (0–180), `emotionalState`
- `night_waking`: `awakeDelay` (0–180), `emotionalState`
- `feeding`: `feedingType` (`breast`|`bottle`|`solids`), `babyState` (`awake`|`asleep`), `feedingAmount`, `isNightFeeding`
- `medication`: `medicationName`, `medicationDose`
- `extra_activities`: `activityDescription` (≥3 chars), `activityDuration` (5–180)

### Estadísticas y notificaciones
```bash
curl -H "Authorization: Bearer $K" "$B/stats?childId=CHILD_ID"                 # stats:read
curl -H "Authorization: Bearer $K" "$B/notifications?childId=CHILD_ID"         # notifications:read
curl -X POST "$B/notifications" -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
  -d '{ "childId":"CHILD_ID", "title":"Recordatorio", "message":"Hora de dormir" }'   # notifications:write
```

### Errores
| HTTP | code | Significado |
|------|------|-------------|
| 401 | missing_key / invalid_key / revoked_key / expired_key | Problema con la key |
| 403 | insufficient_scope / child_not_allowed | Falta scope o acceso al niño |
| 400 | request_error | Datos inválidos |
| 404 | — | No encontrado |
| 429 | rate_limited | Demasiadas solicitudes |

---

## 3. Blueprint del lado de Yose (a implementar dentro de Yose)

Sigue el mismo patrón que Gmail/Calendar/Facturapi en Yose.

### 3.1 Guardar la key del usuario (cifrada)
Tabla nueva en `src/db/schema.ts` (Drizzle), espejo de `gmail_tokens`/`calendar_tokens`:
```ts
export const happyDreamersTokens = pgTable("happy_dreamers_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  apiKey: text("api_key").notNull(),          // CIFRADA con encrypt()
  defaultChildId: varchar("default_child_id", { length: 64 }),
  connectedAt: timestamp("connected_at").defaultNow(),
});
```
Usa `encrypt()` / `decrypt()` de `src/privacy/encryption.ts` para el valor de la key (igual que las demás credenciales).

### 3.2 Servicio HTTP
Nuevo `src/services/happy-dreamers.ts` (espejo de `src/services/facturapi.ts`):
```ts
import { db } from "../db/client.js";
import { happyDreamersTokens } from "../db/schema.js";
import { decrypt } from "../privacy/encryption.js";
import { eq } from "drizzle-orm";

const BASE = "https://happy-dreamers-v2.vercel.app/api/v1";

async function getKey(userId: string): Promise<string | null> {
  const [t] = await db.select().from(happyDreamersTokens)
    .where(eq(happyDreamersTokens.userId, userId)).limit(1);
  return t ? decrypt(t.apiKey) : null;
}

async function hdFetch<T>(userId: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = await getKey(userId);
  if (!key) throw new Error("Happy Dreamers no conectado");
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`HappyDreamers ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const hd = {
  me:        (u: string) => hdFetch(u, "/me"),
  children:  (u: string) => hdFetch(u, "/children"),
  stats:     (u: string, childId: string) => hdFetch(u, `/stats?childId=${childId}`),
  registerEvent: (u: string, body: Record<string, unknown>) => hdFetch(u, "/events", { method: "POST", body }),
  editEvent: (u: string, id: string, body: Record<string, unknown>) => hdFetch(u, `/events/${id}`, { method: "PATCH", body }),
  deleteEvent: (u: string, id: string, childId: string) => hdFetch(u, `/events/${id}?childId=${childId}`, { method: "DELETE" }),
};
```

### 3.3 Intents (lenguaje natural → API)
- `connect_happy_dreamers` → guarda la key que pega el usuario (cifrada) y llama `/me` para listar niños.
- `register_sleep_event` → mapea "Mateo se durmió a las 8:30" a `hd.registerEvent(...)`.
- `get_sleep_stats` → "¿cómo durmió anoche?" → `hd.stats(...)`.
- (opcional) `edit_sleep_event`, `delete_sleep_event`.

Cada intent es un archivo en `src/ai/intents/<name>.ts` (espejo de `send_email.ts`), se registra en
`src/ai/intents/registry.ts`, y su schema se agrega a `getTools()` en `src/ai/intent.ts`.

### 3.4 Identidad
Yose ya resuelve el usuario por canal (`userChannels`). Tras `connect_happy_dreamers`, guarda la key por `userId`
de Yose y usa `/me` para obtener el/los `childId`. Si el usuario tiene varios niños, guarda un `defaultChildId`
o pregunta cuál.

---

## 4. Checklist para "todo listo en Yose"
- [ ] Crear API key en HD (Configuración → API / Desarrolladores) con scopes `children:read,events:read,events:write,stats:read`.
- [ ] Probar la key con `curl $B/me` (debe responder 200 con el usuario y sus niños).
- [ ] Migración Drizzle para `happy_dreamers_tokens`.
- [ ] `src/services/happy-dreamers.ts`.
- [ ] Intents `connect_happy_dreamers`, `register_sleep_event`, `get_sleep_stats` + alta en `registry.ts` y `getTools()`.
- [ ] Probar por WhatsApp/Telegram: conectar key → "registra que durmió 8:30–7:00" → ver el evento en la app de HD.

---

*Referencias en HD: contrato vivo en `/api/v1/openapi.json`, doc visual en `docs/api/happy-dreamers-api.html`,
spec en `docs/api/openapi.yaml`.*
