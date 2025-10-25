# RAG OPTIMIZADO: Horarios Objetivo por Edad

**Propósito**: Este documento contiene SOLO los horarios objetivo/ideales para cada edad.
**Uso**: Sistema de generación de planes lo usa para ajuste progresivo hacia metas.
**Formato**: Optimizado para parsing automático.

---

## EDAD: 0-3 MESES (Recién Nacido)

**Características**:
- Sueño total: 14-17 horas/día
- Siestas: 4-6 siestas de 30-120 min
- Horario flexible basado en señales del bebé
- Tomas nocturnas: 2-4 (normal y esperado)

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": "0-3",
  "wakeTime": "07:00",
  "bedtime": "20:00",
  "nightSleepDuration": "9-11 horas con interrupciones",
  "naps": [
    {"napNumber": 1, "time": "08:30", "duration": "60-90 min"},
    {"napNumber": 2, "time": "11:00", "duration": "60-90 min"},
    {"napNumber": 3, "time": "13:30", "duration": "60-90 min"},
    {"napNumber": 4, "time": "16:00", "duration": "30-60 min"}
  ],
  "totalNapTime": "6-7 horas",
  "awakeWindows": "45-90 min",
  "nightFeedings": "2-4 normales",
  "notes": "Horario flexible, seguir señales del bebé"
}
```

---

## EDAD: 3-6 MESES

**Características**:
- Sueño total: 12-15 horas/día
- Siestas: 3-4 siestas más organizadas
- Sueño nocturno comienza a consolidarse
- Tomas nocturnas: 1-2

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": "3-6",
  "wakeTime": "07:00",
  "bedtime": "20:00",
  "nightSleepDuration": "10-12 horas con 1-2 tomas",
  "naps": [
    {"napNumber": 1, "time": "08:30", "duration": "60-90 min"},
    {"napNumber": 2, "time": "11:30", "duration": "60-90 min"},
    {"napNumber": 3, "time": "14:00", "duration": "60-90 min"},
    {"napNumber": 4, "time": "17:00", "duration": "30 min", "optional": true}
  ],
  "totalNapTime": "4-5 horas",
  "awakeWindows": "1.5-2 horas",
  "nightFeedings": "1-2"
}
```

---

## EDAD: 6 MESES

**Características**:
- Sueño total: 14 horas/día (11 noche + 3 día)
- Siestas: 3 siestas (2 largas + 1 corta)
- Sueño nocturno consolidado

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": 6,
  "wakeTime": "07:00",
  "bedtime": "20:00",
  "nightSleepDuration": "11 horas",
  "naps": [
    {"napNumber": 1, "time": "08:30", "duration": "90 min"},
    {"napNumber": 2, "time": "12:00", "duration": "90-120 min"},
    {"napNumber": 3, "time": "16:00", "duration": "45-60 min"}
  ],
  "totalNapTime": "3-4 horas",
  "awakeWindows": ["1.5-2 hrs", "2 hrs", "2.5 hrs", "3 hrs"]
}
```

---

## EDAD: 9 MESES

**Características**:
- Sueño total: 14 horas/día (11 noche + 3 día)
- Siestas: 2 siestas (transición de 3→2)
- Ventanas despierto más largas

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": 9,
  "wakeTime": "07:00",
  "bedtime": "20:00",
  "nightSleepDuration": "11 horas",
  "naps": [
    {"napNumber": 1, "time": "09:30", "duration": "90 min"},
    {"napNumber": 2, "time": "14:00", "duration": "90-120 min"}
  ],
  "totalNapTime": "3-3.5 horas",
  "awakeWindows": ["2.5-3 hrs", "3 hrs", "4 hrs"]
}
```

---

## EDAD: 13-15 MESES

**Características**:
- Sueño total: 13.5 horas/día (11 noche + 2.5 día)
- Siestas: 2 siestas (1 corta + 1 larga)
- Ventanas despierto aumentan

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": "13-15",
  "wakeTime": "07:00",
  "bedtime": "20:00",
  "nightSleepDuration": "11 horas",
  "naps": [
    {"napNumber": 1, "time": "10:00", "duration": "45-60 min"},
    {"napNumber": 2, "time": "14:15", "duration": "90 min"}
  ],
  "totalNapTime": "2-2.5 horas",
  "awakeWindows": ["3 hrs", "3.5 hrs", "4 hrs"],
  "notes": "Despertar de siesta 1 para asegurar siesta 2"
}
```

---

## EDAD: 15-18 MESES

**Características**:
- Sueño total: 13 horas/día (11 noche + 2 día)
- Siestas: Transición a 1 siesta única
- Ventanas despierto largas

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": "15-18",
  "wakeTime": "07:00",
  "bedtime": "20:00",
  "nightSleepDuration": "11 horas",
  "naps": [
    {"napNumber": 1, "time": "13:00", "duration": "120-150 min"}
  ],
  "totalNapTime": "2-2.5 horas",
  "awakeWindows": ["6 hrs", "4.5 hrs"],
  "notes": "Transición gradual empujando siesta 20 min cada 1-2 días"
}
```

---

## EDAD: 2.5 AÑOS EN ADELANTE

**Características**:
- Sueño total: 12 horas/día (10.5 noche + 1.5 día)
- Siestas: 1 siesta única más corta
- Ventanas despierto muy largas

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": "30+",
  "wakeTime": "07:00",
  "bedtime": "20:30",
  "nightSleepDuration": "10.5 horas",
  "naps": [
    {"napNumber": 1, "time": "13:00", "duration": "90-120 min"}
  ],
  "totalNapTime": "1.5-2 horas",
  "awakeWindows": ["6-6.5 hrs", "5-5.5 hrs"]
}
```

---

## EDAD: 3-5 AÑOS (Sin Siesta)

**Características**:
- Sueño total: 11-12 horas/día (solo nocturno)
- Siestas: Ninguna (tiempo tranquilo en su lugar)
- Ajustar según horario escolar

**HORARIOS OBJETIVO**:
```json
{
  "ageMonths": "36-60",
  "wakeTime": "07:00",
  "bedtime": "19:30",
  "nightSleepDuration": "11-12 horas",
  "naps": [],
  "quietTime": "13:00-14:00",
  "notes": "Calcular bedtime según hora despertar escolar: wakeTime - 11 hrs"
}
```

---

## REGLAS DE AJUSTE PROGRESIVO

### Plan 0 (Initial):
- Base: 100% datos reales del niño
- Ajuste: Solo redondeo a intervalos de 15 min
- Meta: Establecer punto de partida realista

### Plan 1+:
- Base: Plan anterior + eventos nuevos
- Ajuste: Avanzar progresivamente hacia horarios objetivo
- Pasos: Máximo 15-30 min por vez
- Meta: Alcanzar horarios objetivo gradualmente

### Ejemplo de Progresión:
```
Dato real: Bedtime 20:44
Plan 0:    Bedtime 20:30 (redondeo + primer ajuste -14 min)
Plan 1:    Bedtime 20:15 (ajuste -15 min)
Plan 2:    Bedtime 20:00 (meta alcanzada ✅)
```

---

## NOTAS IMPORTANTES

1. **Intervalos de 15 min**: Todos los horarios DEBEN estar en :00, :15, :30, :45
2. **Ajustes graduales**: Nunca saltar más de 30 min entre planes
3. **Tolerancia del bebé**: Usar eventos para validar adaptación
4. **Flexibilidad**: Horarios son guías, no reglas rígidas
5. **Prioridad**: Señales del bebé > Horarios objetivo
