# Feature: Mejoras UX/UI Dashboard - Vista Narrativa y Taxonomía Visual

## Vision

Transformar la experiencia de lectura de la bitacora de eventos de un sistema de "bloques de calendario" dificiles de leer a una **narrativa fluida tipo feed** que permita a admins y padres entender rapidamente "que paso hoy" sin esfuerzo cognitivo.

**Problema actual:** Los bloques de calendario fragmentan visualmente el sueno nocturno y usan iconografia generica que no diferencia tipos de alimentacion.

**Solucion:** Vista narrativa cronologica + taxonomia visual clara + sincronizacion bidireccional calendario-narrativa.

---

## Alcance del Sprint

### MVP (Items 1-3)
1. **Item 1:** Vista Narrativa de Bitacora (Timeline)
2. **Item 2:** Taxonomia Visual (Alimentacion y Sueno)
3. **Item 3:** Vista Dual Split Screen (Admin)

### Diferido (Item 4)
- Panel de Estadisticas y Diagnostico AI (mas complejo, siguiente sprint)

---

## Item 1: Vista Narrativa de Bitacora (Timeline)

### Flujo por Tipo de Usuario

| Vista | Admin (Mariana) | Padres |
|-------|-----------------|--------|
| **Home** | N/A | Ultimos 5 eventos + "Ver todo/Colapsar" |
| **Bitacora Diaria** | Split Screen (50% calendario, 50% narrativa) | Narrativa completa vertical |
| **Semanal/Mensual** | Solo bloques (sin narrativa) | Solo bloques (sin narrativa) |

### Anatomia de Tarjeta de Evento

```
+--------------------------------------------------+
| [ICONO]  Matias tomo 5 oz de leche materna       |
|          08:30 AM                          [>]   |
+--------------------------------------------------+
```

**Elementos:**
1. **Icono (izquierda):** Circular, respeta taxonomia Item 2
2. **Narrativa (centro):** Oracion completa generada automaticamente
3. **Metadatos (debajo):** Hora o rango (08:30 - 09:15)
4. **Navegacion (derecha):** `chevron-right` abre edicion

### Reglas de Narrativa (100% automatica)

| Tipo Evento | Formato Narrativa |
|-------------|-------------------|
| Alimentacion Pecho | "[Nombre] tomo pecho por [X] minutos" |
| Alimentacion Biberon | "[Nombre] tomo [X] oz de [formula/leche]" |
| Alimentacion Solidos | "[Nombre] comio [descripcion]" |
| Siesta | "[Nombre] durmio una siesta de [X] min" |
| Sueno Nocturno | "[Nombre] durmio de [hora] a [hora]" |
| Despertar Nocturno | "[Nombre] desperto a las [hora]" |
| Medicamento | "[Nombre] tomo [medicamento]" |

**Datos incompletos:** Omitir el dato faltante (no mostrar placeholder).

### Comportamiento Home (Padres)

- **Default:** Muestra 5 eventos mas recientes, colapsado
- **"Ver todo":** Expande lista completa del dia
- **"Colapsar":** Vuelve a 5 eventos
- **Persistencia:** Siempre inicia colapsado (no guarda estado)

### Ordenamiento

**Cronologico Inverso Estricto:** El evento con `timestamp` mayor aparece primero (arriba).

### Edge Case: Dia sin eventos

Mostrar empty state amigable: "No hay eventos registrados hoy"

---

## Item 2: Taxonomia Visual (Alimentacion y Sueno)

### 2.1 Iconos de Alimentacion

| Subtipo | Icono Lucide | Contexto |
|---------|--------------|----------|
| Solidos | `UtensilsCrossed` | Desayuno, comida, cena, snacks |
| Biberon | `Baby` (buscar mejor) | Formula, leche extraida |
| Pecho | Buscar en Lucide el mas cercano | Lactancia directa |

**Regla:** Nunca usar icono generico de "cubiertos" para todo.

**Tomas Nocturnas:** Usan el mismo icono que diurnas (biberon/pecho/solidos segun corresponda).

### 2.2 Sueno Nocturno (Layering Logic)

**NOTA:** Revisar implementacion actual - puede que ya este resuelto.

- **Capa Base:** Bloque continuo azul oscuro desde `hora_dormir` hasta `hora_despertar_definitivo`
- **Overlays:** Eventos nocturnos (despertares, tomas) se superponen con `z-index` mayor
- **El bloque base NUNCA se corta visualmente**

### 2.3 Siestas (Diferenciacion Visual)

- **Paleta:** Tonos morados/azules claros (revisar colores existentes, no repetir)
- **Prohibido:** Naranja (asociado a alerta/actividad)
- **Icono:** Diferente al sueno nocturno (elegir el mas apropiado de Lucide)

### Aplicacion por Vista

| Vista | Aplica Taxonomia |
|-------|------------------|
| Diaria | Si (bloques + narrativa) |
| Semanal | Si (solo bloques) |
| Mensual | Si (solo bloques) |

---

## Item 3: Vista Dual Split Screen (Solo Admin)

### Layout

```
+------------------------+------------------------+
|                        |                        |
|   CALENDARIO (50%)     |   NARRATIVA (50%)      |
|   Gantt Chart          |   Timeline fluido      |
|                        |                        |
|   [Bloques con         |   [Tarjetas apiladas   |
|    taxonomia Item 2]   |    sin espacios]       |
|                        |                        |
+------------------------+------------------------+
```

### Logica de Interaccion (Mirroring Bidireccional)

**Click en Calendario:**
1. Click 1: Narrativa hace `scroll-into-view` + highlight con fade gradual (5-7 seg)
2. Click 2 (doble click): Abre modal de edicion

**Click en Narrativa:**
1. Click 1: Calendario hace scroll al bloque correspondiente + highlight
2. Click 2: Abre modal de edicion (o click en chevron)

**Highlight:** Fade gradual que se desvanece en 5-7 segundos.

### Padres: Sin Split Screen

Los padres ven la narrativa en flujo vertical completo, sin el calendario al lado.

---

## UI/UX Estados

### Loading
- Skeleton loaders para tarjetas de narrativa
- Mantener layout estable durante carga

### Error
- Toast con mensaje en espanol si falla carga de eventos
- Retry automatico silencioso

### Exito
- Feedback visual al editar evento (actualizacion inmediata en ambos paneles)

---

## Edge Cases

| Caso | Manejo |
|------|--------|
| Dia sin eventos | Empty state: "No hay eventos registrados hoy" |
| Datos incompletos | Omitir dato faltante en narrativa |
| Evento en progreso | Revisar implementacion actual, puede que no aplique |
| Muchos eventos (scroll largo) | Highlight se mantiene hasta fade, scroll suave |
| Click rapido multiples bloques | Cancelar scroll anterior, hacer nuevo |

---

## Exito

El feature funciona bien cuando:

1. **Admin (Mariana)** puede leer la bitacora del dia en menos de 30 segundos
2. **Padres** entienden que paso sin hacer scroll horizontal en calendario
3. **La taxonomia visual** permite identificar tipo de evento de un vistazo
4. **El mirroring** nunca pierde sincronizacion entre calendario y narrativa
5. **Sueno nocturno** se ve como UNA barra continua, no fragmentada

---

## Notas de la Entrevista

### Decisiones Tomadas

1. **Prioridad:** Items 1-3 son MVP, Item 4 (AI) para siguiente sprint
2. **Narrativa:** 100% automatica, no editable por usuario
3. **Iconos:** Usar Lucide, buscar el mas cercano para "pecho"
4. **Colores siesta:** Usar paleta existente, evitar repetir colores ya usados
5. **Persistencia "Ver todo":** No guarda estado, siempre inicia colapsado
6. **Interaccion Split:** Click 1 = highlight, Click 2 = editar
7. **Mirroring:** Bidireccional (calendario <-> narrativa)
8. **Highlight:** Fade gradual 5-7 segundos
9. **Layering sueno nocturno:** Revisar si ya esta implementado
10. **Eventos en progreso:** Revisar implementacion actual

### Contexto Adicional del Usuario

> "Para que no haya confusion: la vista diaria es donde vive el Item 1 de forma extendida. Para Admin es Split Screen. Para Padres es feed vertical. Las vistas semanal/mensual NO llevan narrativa, solo aplica el rediseno visual (Item 2)."

---

## Siguiente Paso

Ejecutar `/workflows:plan` para agregar arquitectura tecnica y tareas de implementacion.
