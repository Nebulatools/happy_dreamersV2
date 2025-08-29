# 🌐 WORKFLOW MANUAL PARA NAVEGADOR - DATOS REALES

## ✅ CREDENCIALES CONFIRMADAS QUE FUNCIONAN:
- **Usuario Parent:** test@test.com / password
- **Usuario Admin:** admin@admin.com / password

## 📋 PASOS MANUALES PARA CREAR DATOS REALES:

### 1️⃣ **LOGIN COMO USUARIO PARENT**
```
URL: http://localhost:3000
Email: test@test.com
Password: password
```

### 2️⃣ **CREAR NIÑO JOSEFINO (si no existe)**
- Ir a "Agregar Niño" o similar
- Nombre: Josefino
- Apellido: TestImproved  
- Fecha nacimiento: 15/12/2023
- Guardar

### 3️⃣ **COMPLETAR SURVEY**
- Seleccionar niño: Josefino TestImproved
- Ir a Survey/Encuesta
- Completar con:
  - Problemas: Dificultad conciliar + despertares nocturnos
  - Rutina: 20:00-06:30
  - Despertares: 3-5 veces por noche
  - Siesta: Una por la tarde
  - Preocupaciones: "Despertares nocturnos frecuentes, tarda más de 1 hora en dormirse"

### 4️⃣ **REGISTRAR EVENTOS PRE-PLAN 0** (4 eventos)

#### Evento 1 (5 días atrás):
- Tipo: Dormir
- Hora inicio: 21:30 (5 días atrás)
- Hora fin: 05:30 (siguiente día)
- Estado emocional: Llorando
- Notas: "90 minutos para dormirse, lloró mucho"

#### Evento 2 (5 días atrás):
- Tipo: Despertar
- Hora inicio: 02:00 (misma noche)
- Hora fin: 03:30 (misma noche)
- Estado emocional: Llorando
- Notas: "Despertar nocturno severo, lloró 90 minutos"

#### Evento 3 (4 días atrás):
- Tipo: Dormir
- Hora inicio: 21:15
- Hora fin: 05:00 (siguiente día)
- Estado emocional: Inquieto
- Notas: "75 minutos para dormirse"

#### Evento 4 (3 días atrás):
- Tipo: Dormir
- Hora inicio: 21:10
- Hora fin: 05:30 (siguiente día)
- Estado emocional: Inquieto
- Notas: "70 minutos para dormirse"

### 5️⃣ **LOGIN COMO ADMIN PARA CREAR PLAN 0**
```
Logout del parent
URL: http://localhost:3000
Email: admin@admin.com
Password: password
```

### 6️⃣ **CREAR PLAN 0** (como Admin)
- Ir a sección de Planes/Plans
- Seleccionar niño: Josefino TestImproved
- Crear Plan versión 0
- Contenido: Ver archivo `plan-0-content.md`
- Reasoning: "Plan basado en survey + 4 eventos históricos + RAG"

### 7️⃣ **VOLVER A LOGIN PARENT PARA REGISTRAR PROGRESO**
```
Logout del admin
Login: test@test.com / password
```

### 8️⃣ **REGISTRAR EVENTOS POST-PLAN 0** (5 eventos)

#### Evento 5 (2 días atrás):
- Tipo: Dormir
- Hora inicio: 20:30
- Hora fin: 04:30 (siguiente día)
- Estado emocional: Tranquilo
- Notas: "¡Primera mejora! 30 minutos para dormirse con nueva rutina"

#### Evento 6 (2 días atrás):
- Tipo: Despertar
- Hora inicio: 02:00
- Hora fin: 02:30
- Estado emocional: Tranquilo
- Notas: "Despertar reducido a 30 minutos"

#### Evento 7 (ayer):
- Tipo: Dormir
- Hora inicio: 20:20
- Hora fin: 04:30 (siguiente día)
- Estado emocional: Feliz
- Notas: "¡Excelente progreso! Solo 20 minutos para dormirse"

#### Evento 8 (ayer):
- Tipo: Despertar
- Hora inicio: 01:00
- Hora fin: 01:15
- Estado emocional: Tranquilo
- Notas: "Despertar muy breve, solo 15 minutos"

#### Evento 9 (hoy temprano):
- Tipo: Dormir
- Hora inicio: 20:15
- Hora fin: 04:00 (siguiente día)
- Estado emocional: Feliz
- Notas: "¡Increíble! Solo 15 minutos para dormirse, muy tranquilo"

### 9️⃣ **LOGIN ADMIN PARA PLAN 1**
```
Login: admin@admin.com / password
```

### 🔟 **CREAR PLAN 1** (como Admin)
- Crear Plan versión 1 para Josefino
- Contenido: Evolución basada en progreso 90→15 min
- Reasoning: "Basado en 5 eventos POST-Plan 0 que muestran mejora 83%"

### 1️⃣1️⃣ **CREAR CONSULTA** (como Admin)
- Ir a Consultas
- Crear consulta para Josefino
- Transcript: Conversación madre-doctor sobre progreso
- Contenido: Ver archivo `consulta-transcript.md`

### 1️⃣2️⃣ **CREAR PLAN 1.1** (como Admin)
- Crear Plan versión 1.1 para Josefino
- Contenido: Refinamiento basado en consulta
- Reasoning: "Basado en consulta específica para eliminar despertares residuales"

### 1️⃣3️⃣ **VOLVER A PARENT PARA EVENTOS FINALES**
```
Login: test@test.com / password
```

### 1️⃣4️⃣ **REGISTRAR EVENTOS POST-PLAN 1.1** (2 eventos)

#### Evento 10 (hoy):
- Tipo: Siesta
- Hora inicio: 13:00
- Hora fin: 14:30
- Estado emocional: Feliz
- Notas: "Siesta ajustada: 13:00-14:30 (1.5h) implementada sin problemas"

#### Evento 11 (hoy noche):
- Tipo: Dormir
- Hora inicio: 20:12
- Hora fin: [en curso]
- Estado emocional: Feliz
- Notas: "¡ÉXITO! 12 minutos para dormirse y SIN despertar nocturno por primera vez"

## 🎯 RESULTADO ESPERADO:
- **11 eventos** registrados cronológicamente
- **3 planes** creados (0, 1, 1.1) por admin
- **1 consulta** con transcript realista
- **Survey completado**
- **Progreso documentado:** 90→75→70→30→20→15→12 min conciliación
- **Estado emocional:** crying → fussy → calm → happy
- **Despertares:** 90 min → 30 min → 15 min → 0 min

## 🏆 VERIFICACIÓN FINAL:
- Login como test@test.com / password
- Seleccionar Josefino TestImproved
- Ver dashboard con todos los datos
- Confirmar progreso y gráficos
- ¡Workflow real funcionando en UI!