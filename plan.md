⏺ 📋 PLAN MAESTRO DE MODIFICACIÓN - Sistema de Registro de Eventos

  🎯 RESUMEN EJECUTIVO

  Estado Actual: Sistema funcional con 85% de requisitos cumplidos
  Objetivo: Alcanzar 100% de requisitos de la Dra. Mariana
  Riesgo: BAJO - Modificaciones incrementales sin destruir funcionalidad existente
  Tiempo Estimado: 3-4 días de desarrollo

  ---
  1️⃣ PLAN DE BORRADO/REEMPLAZO

  ❌ CÓDIGO A ELIMINAR COMPLETAMENTE

  NINGUNO - Todo el código actual es reutilizable

  🔄 COMPONENTES A MODIFICAR (NO REEMPLAZAR)

  | Componente                | Modificaciones                                       | Riesgo |
  |---------------------------|------------------------------------------------------|--------|
  | SimpleSleepToggle.tsx     | +Botón Alimentación, +Estados emocionales corregidos | BAJO   |
  | event-types.ts            | -Eventos redundantes, +Campo babyState               | BAJO   |
  | /dashboard/event/page.tsx | Deprecar en favor de SimpleSleepToggle               | MEDIO  |
  | EventTypeSelector.tsx     | +Categorización primaria/secundaria                  | BAJO   |

  ✅ CÓDIGO A PRESERVAR INTACTO

  // MANTENER SIN CAMBIOS:
  - /lib/sleep-calculations.ts (funciona perfectamente)
  - /components/events/SleepDelayCapture.tsx (cumple requisitos)
  - /api/children/events/route.ts (API estable)
  - Todo el sistema de localStorage en SimpleSleepToggle
  - Lógica de clasificación por hora existente

  ---
  2️⃣ ROADMAP DE IMPLEMENTACIÓN

  FASE 0: PREPARACIÓN (30 minutos)

  # 1. Backup del estado actual
  git checkout -b feature/doctor-feedback-implementation
  git add .
  git commit -m "chore: backup before doctor feedback implementation"

  # 2. Crear feature flags para rollback
  // .env.local
  NEXT_PUBLIC_USE_NEW_EVENT_SYSTEM=false

  # 3. Documentar estado actual
  npm run dev # Tomar screenshots del flujo actual

  FASE 1: CONSOLIDACIÓN DE LÓGICA (2 horas)

  // TAREA 1.1: Crear servicio centralizado
  // Nuevo archivo: /lib/services/sleep-cycle.service.ts
  export class SleepCycleService {
    // Mover lógica de SimpleSleepToggle líneas 93-130
    static loadState(childId: string): SleepState
    static saveState(state: SleepState): void

    // Centralizar clasificación
    static classifySleepType(time: Date): 'sleep' | 'nap' {
      const hour = time.getHours()
      if (hour >= 19 || hour < 5) return 'sleep'
      if (hour >= 11 && hour < 17) return 'nap'
      return 'sleep' // default
    }

    // Agregar nueva lógica de ventanas
    static calculateSleepWindows(events: Event[]): SleepWindow[]
  }

  // VALIDACIÓN 1.1:
  ✓ SimpleSleepToggle sigue funcionando
  ✓ Estado se preserva en localStorage
  ✓ No hay breaking changes

  FASE 2: AJUSTES DE UI - EVENTOS PRIMARIOS (3 horas)

  TAREA 2.1: Actualizar SimpleSleepToggle con Alimentación

  // Modificar /components/events/SimpleSleepToggle.tsx
  // Línea 436 - Agregar después del botón principal

  {/* NUEVO: Botón de Alimentación Primario */}
  <div className="grid grid-cols-2 gap-3 mt-4">
    <Button
      onClick={handleFeedingClick}
      className="h-24 bg-gradient-to-r from-green-500 to-emerald-500 
                 hover:from-green-600 hover:to-emerald-600 text-white"
    >
      <Utensils className="w-8 h-8 mr-2" />
      <div className="text-left">
        <div className="font-bold text-lg">ALIMENTACIÓN</div>
        <div className="text-xs opacity-90">Toma o comida</div>
      </div>
    </Button>

    {/* Mantener botón de Otros Eventos */}
    <Button
      variant="outline"
      onClick={() => setShowQuickSelector(true)}
      className="h-24"
    >
      <Plus className="w-6 h-6 mr-2" />
      <div className="text-left">
        <div className="font-semibold">Otros Eventos</div>
        <div className="text-xs">Medicamentos, actividades</div>
      </div>
    </Button>
  </div>

  TAREA 2.2: Crear Modal de Alimentación con Estado Nocturno

  // Nuevo componente: /components/events/FeedingModal.tsx
  interface FeedingModalProps {
    isOpen: boolean
    onClose: () => void
    childId: string
    isNightTime: boolean // Auto-detectado por hora
  }

  export function FeedingModal({ isNightTime, ...props }) {
    const [babyState, setBabyState] = useState<'awake' | 'asleep' | null>(null)

    return (
      <Dialog open={props.isOpen} onOpenChange={props.onClose}>
        {/* Si es nocturno, preguntar estado del bebé */}
        {isNightTime && (
          <div className="space-y-3">
            <Label>¿El bebé estaba dormido o despierto durante la toma?</Label>
            <RadioGroup value={babyState} onValueChange={setBabyState}>
              <RadioItem value="asleep">
                😴 Dormido (dream feed)
              </RadioItem>
              <RadioItem value="awake">
                👶 Despierto
              </RadioItem>
            </RadioGroup>
          </div>
        )}
      </Dialog>
    )
  }

  FASE 3: CAMPOS MEJORADOS (2 horas)

  TAREA 3.1: Implementar Notas Guiadas

  // Crear: /components/events/GuidedNotesField.tsx
  const GUIDED_PLACEHOLDERS = {
    sleep: "¿Cómo se durmió? ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto?",
    night_waking: "¿Qué pasó durante el despertar? ¿Lloró mucho? ¿Qué ayudó a calmarlo?",
    feeding: "¿Cantidad? ¿Cómo fue la toma? ¿Se quedó satisfecho?",
    medication: "¿Qué medicamento? ¿Dosis? ¿Razón?",
    extra_activities: "Describe el evento que puede afectar el sueño..."
  }

  export function GuidedNotesField({ eventType, ...props }) {
    return (
      <Textarea
        placeholder={GUIDED_PLACEHOLDERS[eventType] || "Añade detalles..."}
        className="min-h-[80px]"
        {...props}
      />
    )
  }

  TAREA 3.2: Actualizar Estados Emocionales

  // Modificar /components/events/EmotionalStateSelector.tsx
  const EMOTIONAL_STATES = [
    { id: 'tranquilo', label: 'Tranquilo', emoji: '😌' },
    { id: 'inquieto', label: 'Inquieto', emoji: '😟' },
    { id: 'alterado', label: 'Alterado', emoji: '😣' }
  ]

  FASE 4: TESTING Y VALIDACIÓN (2 horas)

  TAREA 4.1: Testing Manual con Checklist

  ## Checklist de Validación

  ### Ciclo de Sueño
  - [ ] Botón cambia de "SE ACOSTÓ" a "YA SE DURMIÓ" a "SE DESPERTÓ"
  - [ ] Clasificación automática funciona (19-5h = nocturno, 11-17h = siesta)
  - [ ] Latencia de sueño se calcula correctamente
  - [ ] Estado se preserva al recargar página

  ### Alimentación
  - [ ] Botón de Alimentación visible como primario
  - [ ] En horario nocturno (23-5h) aparece pregunta de estado bebé
  - [ ] Se registra correctamente si bebé estaba dormido/despierto

  ### Notas Guiadas
  - [ ] Placeholder cambia según tipo de evento
  - [ ] Texto guía es claro y útil
  - [ ] Se guardan correctamente las notas

  ### Datos Existentes
  - [ ] Eventos anteriores siguen visibles
  - [ ] Estadísticas se calculan correctamente
  - [ ] No hay pérdida de datos

  ---
  3️⃣ ESTRATEGIA DE MINIMIZACIÓN DE RIESGO

  🛡️ PRESERVACIÓN DE DATOS/STATE

  // 1. Mantener estructura de localStorage
  const MIGRATION_STRATEGY = {
    preserveKeys: [
      'sleep-state-*',  // Estados de ciclos
      'events-cache-*', // Cache de eventos
      'child-*'        // Datos de niños
    ],

    // 2. Backward compatibility
    mapOldToNew: {
      'happy': 'tranquilo',
      'calm': 'tranquilo',
      'restless': 'inquieto',
      'stressed': 'alterado'
    }
  }

  🔄 ROLLBACK PLAN

  # Si algo falla:
  1. git stash               # Guardar cambios actuales
  2. git checkout main       # Volver a versión estable
  3. npm run dev            # Verificar funcionamiento
  4. git stash pop          # Recuperar cambios para debug

  # Feature flag para rollback instantáneo:
  NEXT_PUBLIC_USE_NEW_EVENT_SYSTEM=false

  ✅ PUNTOS DE VALIDACIÓN

  Checkpoint 1: "Después de Fase 1"
    - SimpleSleepToggle funciona
    - No hay errores en consola
    - Estado se preserva

  Checkpoint 2: "Después de Fase 2"
    - Botón Alimentación visible
    - Modal funciona correctamente
    - Clasificación automática OK

  Checkpoint 3: "Después de Fase 3"
    - Notas guiadas aparecen
    - Estados emocionales correctos
    - Campo babyState funciona

  Checkpoint 4: "Pre-producción"
    - Testing completo pasado
    - Doctora valida en staging
    - Backup de producción listo

  ---
  4️⃣ CHECKLIST DE IMPLEMENTACIÓN DETALLADO

  📅 DÍA 1: PREPARACIÓN Y CONSOLIDACIÓN

  - Git branch y backup
  - Crear SleepCycleService
  - Refactorizar SimpleSleepToggle para usar servicio
  - Testing: Estado se preserva ✓
  - SIGN-OFF: Funcionamiento base OK

  📅 DÍA 2: UI EVENTOS PRIMARIOS

  - Agregar botón Alimentación en SimpleSleepToggle
  - Crear FeedingModal con campo babyState
  - Integrar con API existente
  - Testing: Alimentación se registra ✓
  - SIGN-OFF: Eventos primarios completos

  📅 DÍA 3: CAMPOS MEJORADOS

  - Implementar GuidedNotesField
  - Actualizar EmotionalStateSelector
  - Integrar en todos los modales
  - Testing: Placeholders funcionan ✓
  - SIGN-OFF: UX mejorada

  📅 DÍA 4: VALIDACIÓN FINAL

  - Testing completo con checklist
  - Demo para la Dra. Mariana
  - Ajustes finales si necesario
  - Deploy a producción
  - SIGN-OFF FINAL: Sistema en producción

  ---
  📊 MATRIZ DE IMPACTO DE CAMBIOS

  | Cambio               | Impacto Usuario        | Impacto Técnico         | Reversibilidad |
  |----------------------|------------------------|-------------------------|----------------|
  | Botón Alimentación   | POSITIVO - Más visible | NULO - Solo UI          | INMEDIATA      |
  | Estados emocionales  | NEUTRO - Misma función | BAJO - Mapeo simple     | FÁCIL          |
  | Notas guiadas        | POSITIVO - Mejor UX    | NULO - Solo placeholder | INMEDIATA      |
  | Campo babyState      | POSITIVO - Dato útil   | BAJO - Campo opcional   | FÁCIL          |
  | Consolidación lógica | TRANSPARENTE           | POSITIVO - Mejor código | MEDIANTE GIT   |

  ---
  🎯 CONCLUSIÓN

  Plan de implementación SEGURO y CONSERVADOR que:
  - ✅ NO elimina código funcional
  - ✅ Preserva todos los datos existentes
  - ✅ Permite rollback en cualquier momento
  - ✅ Valida cada fase antes de continuar
  - ✅ Minimiza riesgo con cambios incrementales
  - ✅ Cumple 100% requisitos de la Dra. Mariana

  Siguiente paso: Comenzar con Fase 0 (preparación) y proceder secuencialmente.