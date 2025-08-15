# 🧪 GUÍA DE TESTING BACKEND EVENTOS V3

## 📋 Contexto del Testing

- **Objetivo**: Validar integridad del backend antes de Iteración 4
- **Estado Actual**: Backend-mongodb-guardian confirmó 95% integridad de datos
- **Ignorar**: Bug del calendario UI (eventos +3 horas después de 18:00)
- **Scope**: Testing exhaustivo del backend API `/api/children/events`

---

## 🚀 MÉTODO 1: Testing Manual Automatizado

### Prerrequisitos

1. **Servidor corriendo**: `npm run dev` en puerto 3000
2. **Usuario de prueba**: Registrado en la aplicación
3. **Niño de prueba**: Al menos un niño creado para el usuario

### Configuración

1. **Obtener Session Token**:
   ```bash
   # En el navegador (DevTools > Application > Cookies)
   # Buscar: next-auth.session-token
   # Copiar el valor
   ```

2. **Obtener Child ID**:
   ```bash
   # En la aplicación, inspeccionar requests a /api/children/events
   # O usar MongoDB Compass para ver el _id del niño
   ```

3. **Configurar archivo**:
   ```javascript
   // En testing/manual-backend-testing.js
   const CONFIG = {
     BASE_URL: 'http://localhost:3000',
     USER_SESSION_TOKEN: 'tu-session-token-real',
     TEST_CHILD_ID: 'tu-child-id-real',
     API_ENDPOINT: '/api/children/events'
   }
   ```

### Ejecución

```bash
cd /Users/rogelioguz/Documents/Code\ House/happy_dreamers_v0
node testing/manual-backend-testing.js
```

### Resultado Esperado
```
🚀 INICIANDO TESTING BACKEND EVENTOS V3
============================================================
✅ [CONFIG] Conectividad servidor
✅ [CONFIG] Acceso a niño - Eventos existentes: 5
✅ [CREATION] Evento sueño básico
✅ [CREATION] Sin endTime inicial
✅ [UPDATE] Agregar endTime
✅ [UPDATE] Cálculo automático duration - 420 min
✅ [UPDATE] Formato durationReadable - 7h
...
============================================================
📊 REPORTE FINAL - BACKEND EVENTOS V3
============================================================
Total pruebas: 25
✅ Exitosas: 24 (96.0%)
❌ Fallidas: 1
Estado: ✅ SISTEMA APROBADO PARA ITERACIÓN 4
```

---

## 🧪 MÉTODO 2: Testing con Herramientas HTTP

### Usando curl

1. **Test básico de creación**:
```bash
curl -X POST http://localhost:3000/api/children/events \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TU_TOKEN" \
  -d '{
    "childId": "TU_CHILD_ID",
    "eventType": "sleep",
    "startTime": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
    "emotionalState": "tranquilo",
    "sleepDelay": 15,
    "notes": "Prueba de creación de evento"
  }'
```

2. **Test de actualización (PATCH)**:
```bash
curl -X PATCH http://localhost:3000/api/children/events \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TU_TOKEN" \
  -d '{
    "eventId": "EVENT_ID_GENERADO",
    "childId": "TU_CHILD_ID",
    "endTime": "'$(date -u -d "+8 hours" +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  }'
```

3. **Test de recuperación (GET)**:
```bash
curl -X GET "http://localhost:3000/api/children/events?childId=TU_CHILD_ID" \
  -H "Cookie: next-auth.session-token=TU_TOKEN"
```

### Usando Postman

1. **Importar colección**:
   - Crear nueva colección "Happy Dreamers Backend Tests"
   - Configurar variable `{{baseUrl}}` = `http://localhost:3000`
   - Configurar variable `{{sessionToken}}` = tu token
   - Configurar variable `{{childId}}` = tu child ID

2. **Requests configurados**:
   - `POST Create Sleep Event`
   - `PATCH Update Event EndTime`
   - `GET Child Events`
   - `DELETE Event (opcional)`

---

## 📊 CASOS DE PRUEBA ESPECÍFICOS

### 1. CREACIÓN DE EVENTOS (POST)

**✅ Casos que DEBEN funcionar**:
- [ ] Evento sueño con todos los campos
- [ ] Evento siesta con sleepDelay
- [ ] Evento con notas vacías
- [ ] Estados emocionales: tranquilo, inquieto, alterado
- [ ] Evento wake sin endTime

**❌ Casos que DEBEN fallar**:
- [ ] Sin childId (400)
- [ ] Sin eventType (400)
- [ ] ChildId inexistente (404)

### 2. ACTUALIZACIÓN DE EVENTOS (PATCH)

**✅ Verificaciones críticas**:
- [ ] EndTime se agrega correctamente
- [ ] Duration se calcula automáticamente
- [ ] DurationReadable tiene formato correcto ("7h 30min")
- [ ] SleepDelay se considera en el cálculo
- [ ] Eventos con timezone se manejan correctamente

### 3. EDGE CASES

**⚠️ Casos límite**:
- [ ] Evento que cruza medianoche
- [ ] SleepDelay > duración total (debe ser 0 o mínimo)
- [ ] Duración negativa (debe fallar o ser 0)
- [ ] Notas muy largas (1000+ caracteres)
- [ ] SleepDelay extremo (>180 min debe limitarse)

### 4. CONCURRENCIA

**🔄 Pruebas simultáneas**:
- [ ] Crear múltiples eventos rápidamente
- [ ] GET mientras se hace PATCH
- [ ] Múltiples PATCH al mismo evento

### 5. VALIDACIÓN DE DATOS

**📋 Verificaciones**:
- [ ] Campos requeridos vs opcionales
- [ ] Tipos de datos correctos
- [ ] Formato ISO de fechas
- [ ] Rangos válidos de sleepDelay

### 6. RECUPERACIÓN

**📥 Tests de GET**:
- [ ] Eventos ordenados cronológicamente
- [ ] Performance <2 segundos
- [ ] Estructura de respuesta correcta
- [ ] Manejo de casos sin eventos

---

## 🎯 CRITERIOS DE APROBACIÓN

### Sistema APROBADO si:
- ✅ **≥95% de pruebas exitosas**
- ✅ **Cálculo automático de duration funciona**
- ✅ **DurationReadable se genera correctamente**
- ✅ **Ordenamiento cronológico es consistente**
- ✅ **Validaciones rechazan datos incorrectos**
- ✅ **Performance <2 segundos para GET**

### Sistema NECESITA CORRECCIÓN si:
- ❌ **<95% de pruebas exitosas**
- ❌ **Duration no se calcula automáticamente**
- ❌ **Ordenamiento inconsistente**
- ❌ **Acepta datos inválidos**
- ❌ **Performance >2 segundos**

---

## 🚨 PROBLEMAS CONOCIDOS A IGNORAR

1. **Bug calendario UI**: Eventos después de 18:00 se muestran +3 horas
   - **Status**: CONOCIDO, frontend únicamente
   - **Acción**: IGNORAR durante este testing
   - **Verificación**: Backend retorna datos correctos

---

## 📝 FORMATO DE REPORTE

### Para cada prueba ejecutada, documentar:

```markdown
## TEST EJECUTADO: [Fecha/Hora]

### Configuración
- Servidor: http://localhost:3000
- Usuario: [user-id]
- Niño: [child-id]
- Eventos previos: [cantidad]

### Resultados
- Total pruebas: 25
- Exitosas: 24 (96%)
- Fallidas: 1
- Tiempo total: 45 segundos

### Pruebas Fallidas
- [VALIDATION] ChildId inexistente: Debería retornar 404

### Estado Final
✅ APROBADO para Iteración 4

### Evidencia
- Duration calculada correctamente: 420 min → "7h"
- DurationReadable generado: "7h 30min"
- Ordenamiento cronológico: CORRECTO
- Performance GET: 150ms
```

---

## 🔧 TROUBLESHOOTING

### Error: "No autorizado" (401)
- Verificar que el session token sea válido
- Verificar que el usuario esté logueado en el navegador
- Regenerar token desde DevTools

### Error: "Niño no encontrado" (404)
- Verificar que el childId exista en MongoDB
- Verificar que el niño pertenezca al usuario actual
- Verificar permisos de administrador si es necesario

### Error: "ECONNREFUSED"
- Verificar que Next.js esté corriendo en puerto 3000
- Verificar que no haya firewall bloqueando
- Probar acceso directo en navegador

### Pruebas inconsistentes
- Limpiar eventos de prueba antes de ejecutar
- Usar timestamps únicos para cada evento
- Verificar que no haya otros usuarios modificando datos

---

## 📈 PRÓXIMOS PASOS

### Si el testing es EXITOSO (≥95%):
1. ✅ **Marcar backend como validado**
2. ✅ **Proceder con Iteración 4 (alimentación)**
3. ✅ **Continuar ignorando bug calendario UI**
4. ✅ **Usar estos tests como baseline para futuras iteraciones**

### Si el testing FALLA (<95%):
1. ❌ **Identificar y corregir issues específicos**
2. ❌ **Re-ejecutar testing completo**
3. ❌ **NO proceder a Iteración 4 hasta resolución**
4. ❌ **Documentar correcciones aplicadas**

---

*Última actualización: Enero 2025*