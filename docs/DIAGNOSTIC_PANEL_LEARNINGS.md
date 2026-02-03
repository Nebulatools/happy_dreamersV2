# Institutional Learnings: Diagnostic/Validation Panel for Children's Sleep Data

**Document Created:** 2026-02-03
**Purpose:** Capture design patterns, gotchas, and lessons learned from existing Happy Dreamers implementations to guide the diagnostic panel (Item 4: Panel de Diagnóstico)

---

## Executive Summary

Based on analysis of AdminStatistics component, Event Registration System, and existing API patterns, here are the critical patterns and gotchas for building a comprehensive diagnostic/validation panel.

---

## 1. Dashboard & Statistics Implementation Patterns

### Pattern: Multi-Tab Organization (AdminStatistics.tsx)

**What Works:**
- Tabs organize different concern levels (urgencia, hoy, todos)
- Top-level metrics cards (KPI cards) provide at-a-glance status
- Search/filter on tab content, not at the component level
- Badge counts on tabs give visual urgency signals

**Key Implementation from AdminStatistics:**
```typescript
// Tab structure with urgency-based organization
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="urgencia">
      <AlertTriangle className="h-4 w-4 mr-2" />
      Pacientes en Urgencia
      {(criticalAlerts.length + warningAlerts.length) > 0 && (
        <Badge>{count}</Badge>
      )}
    </TabsTrigger>
  </TabsList>

  <TabsContent value="urgencia">
    {/* Critical alerts rendered here */}
  </TabsContent>
</Tabs>
```

**Relevance to Diagnostic Panel:**
- G1/G2/G3/G4 groups can map to tabs OR cards
- Alerts should bubble to urgency tab
- Badge counts show validation status

**Gotcha:**
- Don't put search on the Tabs component itself - put on TabsContent
- This prevents re-rendering the entire tabs container

---

### Pattern: Health Status Visualization (3-Color System)

**AdminStatistics Uses:**
```typescript
// Red (critical) → Yellow (warning) → Green (ok)
interface ChildAlert {
  severity: "critical" | "warning" | "ok"
  diagnosis: string
  lastUpdate: string
}
```

**Card Styling by Severity:**
```typescript
// Critical: border-red-200, red-100 backgrounds, red icons
<Card className="border-red-200 hover:shadow-md">
  <div className="bg-red-50 rounded-lg p-3">
    {alert.diagnosis}
  </div>
  <Button className="bg-red-600 hover:bg-red-700">
    Revisar y Crear Plan
  </Button>
</Card>

// Warning: border-yellow-200, yellow-100 backgrounds
<Card className="border-yellow-200">
  <div className="bg-yellow-50 rounded-lg">
    {alert.diagnosis}
  </div>
  <Button variant="outline" className="text-yellow-700">
    Revisar Bitácora
  </Button>
</Card>
```

**For Diagnostic Panel:**
- Apply same color system: Red = schedule violated > 15 min | Yellow = warnings | Green = compliant
- Each G1/G2/G3/G4 card gets visual urgency indicator
- Calcs should be done server-side for consistency

---

### Pattern: Metrics Aggregation (loadAdminData)

**Critical Pattern:**
```typescript
// Load aggregated metrics from dedicated API endpoint
const metricsResponse = await fetch("/api/admin/dashboard-metrics")
const metricsData = await metricsResponse.json()
const { totalChildren, activeToday } = metricsData
```

**Why This Matters:**
- Don't aggregate on client - risk of inconsistency
- Single endpoint provides source of truth
- Reduces N+1 queries

**For Diagnostic Panel:**
- Create `/api/admin/diagnostic-validation` endpoint
- Returns all 4 groups' validation status for a child
- Includes: schedule deviations, medical flags, food classification, environmental factors
- Aggregates surveys + events in one call

---

## 2. Survey Data Handling Patterns

### Pattern: Defensive Validation for Partial Data

**From SPEC-SPRINT Validation Example:**
```typescript
function validateReflujo(surveyData) {
  const indicadores = []

  // Existing fields (work fine if undefined)
  if (surveyData.reflujoColicos === true) indicadores.push('reflujo')
  if (surveyData.percentilBajo === true) indicadores.push('peso_bajo')

  // Future fields (will be undefined until survey update)
  if (surveyData.posicionVertical === true) indicadores.push('posicion_vertical')

  return {
    alert: indicadores.length >= 1,
    indicadores,
    pendientes: 6  // How many indicators are still missing data
  }
}
```

**Key Insight:**
- Don't block functionality on missing survey fields
- Show "X of Y indicators detected" + "Z pending from survey update"
- Uses `?.` optional chaining everywhere
- `undefined` defaults to false in boolean checks

**For Diagnostic Panel:**
- All validation functions must be defensive
- Show "pending from survey" message on G2 (medical) indicators
- Mark which fields still need data in Item 4B (survey update)
- No blocking - panel must work with partial data

---

### Pattern: Survey Data Located in Child Document

**From codebase-map.md & patterns.md:**
```typescript
interface Child {
  _id: ObjectId
  firstName: string
  surveyData: {
    completed: boolean
    responses: Record<string, any>  // Dynamic survey responses
    lastUpdated: Date
  }
}
```

**Access Pattern:**
```typescript
// Survey data comes with the child object
const child = await db.collection('children').findOne({ _id: childId })
const surveyResponses = child.surveyData?.responses || {}

// Direct field access
const reflujo = surveyResponses.reflujoColicos
const percentil = surveyResponses.percentilBajo
```

**Gotcha:**
- Survey fields might not exist until survey is completed
- Don't assume structure - always check exists with optional chaining
- `surveyData.responses` is a flat object (not nested)

---

## 3. Event Aggregation & Validation Patterns

### Pattern: Query Events with Date Range + Child Isolation

**From EventRegistrationSystem.md & API patterns:**
```typescript
// Validate API call includes childId + dateRange
const response = await fetch(
  '/api/children/events?childId={id}&from={ISO}&to={ISO}'
)

// Response structure
{
  _id: ObjectId,
  childId: ObjectId,
  parentId: ObjectId,  // Data isolation - always check
  eventType: string,
  startTime: string,   // ISO with offset
  endTime?: string,
  duration?: number,   // Calculated automatically
  emotionalState?: string,
  sleepDelay?: number
}
```

**Data Isolation Requirement:**
```typescript
// CRITICAL: Always verify parentId in API
if (event.parentId !== session.user.id && session.user.role !== 'admin') {
  throw new Error('Unauthorized')
}
```

**For Diagnostic Panel:**
- Query events for dateRange (e.g., last 7 days, last 30 days)
- Group by eventType for aggregation
- Calculate: sleep totals, wake times, nap patterns
- Verify childId + admin authorization

---

### Pattern: Sleep Session vs Event Duration

**From EVENT_SYSTEM_ARCHITECTURE.md:**
```typescript
// Sleep/nap with duration = a "session" (multi-hour event)
{
  eventType: 'sleep',
  startTime: '2025-01-27T20:15:00Z',  // When they fell asleep
  endTime: '2025-01-28T08:00:00Z',    // When they woke
  duration: 695,  // minutes
  sleepDelay: 15  // minutes to fall asleep (bedtime → startTime)
}

// Wake = instantaneous (no duration)
{
  eventType: 'wake',
  startTime: '2025-01-28T08:00:00Z',
  endTime: null,  // No duration for wake events
}

// Feeding = point-in-time or range
{
  eventType: 'feeding',
  startTime: '2025-01-28T12:00:00Z',
  feedingType: 'breast',
  isNightFeeding: false  // Flag, not separate type
}
```

**Calculations for G1 (Schedule) Validation:**
```typescript
// Extract actual wake time from last sleep session
const lastSleepEvent = events.find(e => e.eventType === 'sleep')
const actualWakeTime = new Date(lastSleepEvent.endTime)
const scheduledWakeTime = plan.wakeTime  // e.g., 7:00 AM

// Deviation calculation
const deviationMinutes = Math.abs(
  (actualWakeTime.getTime() - scheduledWakeTime.getTime()) / (1000 * 60)
)
const isDeviation = deviationMinutes > 15  // Tolerance: ±15 min
```

**Gotcha:**
- `wake` event might not exist if only sleep is tracked
- Calculate actual wake from last sleep's `endTime`
- Don't confuse `sleepDelay` (minutes to fall asleep) with duration

---

## 4. Admin-Only Feature Patterns

### Pattern: Role-Based Visibility & Deep Linking

**From AdminStatistics.tsx:**
```typescript
// Check role before rendering
if (session?.user?.role !== "admin") {
  setAdminUsers([])
  return
}

// Use deep-linking to navigate to admin views
const handlePatientClick = (childId: string) => {
  // TODO: Navigate to diagnostic panel
  logger.info("Navegar a paciente:", childId)
}

const handleCreatePlan = (childId: string) => {
  // Navigate to plan creation
  logger.info("Crear plan para:", childId)
}
```

**URL Deep-Linking Pattern:**
```typescript
// From admin dashboard, navigate with query params
router.push(`/dashboard/diagnostic/${childId}?tab=schedule`)

// Or use URL fragments for modal
router.push(`/dashboard/patients/${childId}#validation`)
```

**For Diagnostic Panel:**
- Accessible only from `/dashboard/diagnostic/[childId]`
- Protect with `if (session?.user?.role !== 'admin') redirect('/')`
- Add back navigation to patient list
- Use query params for tab state: `?activeGroup=G2`

---

### Pattern: Loading States & Empty States

**From AdminStatistics.tsx:**
```typescript
if (isLoading) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Activity className="h-16 w-16 text-muted-foreground animate-pulse" />
      <h2 className="text-2xl font-bold">Cargando Dashboard Administrativo</h2>
      <p className="text-muted-foreground text-center">
        Obteniendo métricas y datos de todos los pacientes...
      </p>
    </div>
  )
}

// Empty state for no alerts
if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardContent className="py-16">
        <div className="text-center space-y-3">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h3 className="text-lg font-medium">Sin casos urgentes</h3>
          <p className="text-muted-foreground">Todos están estables.</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

**For Diagnostic Panel:**
- Loading state while fetching child profile + events + survey data
- Empty state: "Sin plan activo - no se puede validar" (prerequisite check)
- Error state: "Error al cargar eventos - por favor intenta de nuevo"

---

## 5. Modal & Data Flow Patterns

### Pattern: Modal for Read-Only Alert Inspection (from SPEC-SPRINT)

**UX Decision:**
> "UX al clickear alerta: Modal overlay (solo lectura + navegación)"

**Implementation Pattern:**
```typescript
// In diagnostic panel
const [selectedAlert, setSelectedAlert] = useState<ChildAlert | null>(null)

return (
  <>
    {/* Card is clickable */}
    <Card
      onClick={() => setSelectedAlert(alert)}
      className="cursor-pointer hover:shadow-md"
    >
      {/* Alert summary */}
    </Card>

    {/* Modal shows full details */}
    <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedAlert?.diagnosis}</DialogTitle>
        </DialogHeader>

        {/* Deep-link to events filtered for this issue */}
        <div className="space-y-4">
          {/* Read-only display of validation details */}
          <div className="bg-gray-50 p-4 rounded">
            {/* Show specific events that triggered the alert */}
            {relevantEvents.map(event => (
              <div key={event._id} className="text-sm">
                {event.startTime}: {event.eventType} ({deviation} min deviation)
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={() => navigateToEvents()}>
            Ver todos los eventos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
)
```

**For Diagnostic Panel:**
- Click a G2 medical alert → Modal shows which survey fields were evaluated
- Click a G1 schedule alert → Modal shows the deviated events with time differences
- Include "View in calendar" button to navigate to calendar view filtered by date
- Modal is read-only (no edits) - just navigation and details

---

## 6. AI/LLM Integration Patterns

### Pattern: On-Demand AI Resumen (from SPEC-SPRINT)

**Decision:**
> "Frecuencia resumen AI: On-demand (botón)"

**Implementation Pattern:**
```typescript
// Button to trigger AI analysis
const [aiSummary, setAiSummary] = useState<string | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)

const handleAIAnalysis = async () => {
  try {
    setIsAnalyzing(true)
    const response = await fetch('/api/admin/diagnostic-ai-summary', {
      method: 'POST',
      body: JSON.stringify({
        childId,
        validationResults: {
          G1: scheduleValidation,
          G2: medicalValidation,
          G3: foodValidation,
          G4: environmentalValidation
        }
      })
    })
    const { summary } = await response.json()
    setAiSummary(summary)
  } finally {
    setIsAnalyzing(false)
  }
}

return (
  <Button
    onClick={handleAIAnalysis}
    disabled={isAnalyzing}
  >
    {isAnalyzing ? 'Analizando...' : 'Obtener Análisis AI'}
  </Button>
)
```

**API Response Format:**
```typescript
{
  summary: "El niño tiene reflujo diagnosticado y está tomando medicinas. Los horarios de sueño desviaron 18 min el 29 de enero. Considere...",
  recommendations: ["Monitorear despertares", "Ajustar hora de acostarse 15 min antes"],
  confidence: 0.92
}
```

**For Diagnostic Panel:**
- Pasante AI generates observations on-demand (not continuous)
- Uses aggregated validation results + events + survey data
- Shows confidence level
- Output is descriptive + general recommendations (not prescriptive)

---

## 7. Component Organization & File Structure

### Recommended Structure for Diagnostic Panel

```
/components/diagnostic/
├── DiagnosticPanel.tsx                 # Main container
├── ProfileHeader.tsx                   # Patient profile card
├── ValidationGroups/
│   ├── G1ScheduleValidation.tsx       # Schedule validation
│   ├── G2MedicalValidation.tsx        # Medical indicators
│   ├── G3FoodValidation.tsx           # Food classification
│   └── G4EnvironmentalValidation.tsx  # Environmental factors
├── Modals/
│   ├── AlertDetailModal.tsx           # Read-only alert details
│   └── EventDetailModal.tsx           # Event details modal
├── AIAnalysis/
│   ├── AIResumenCard.tsx              # AI summary display
│   └── AIAnalysisModal.tsx            # Full analysis
└── types.ts                            # Validation result types

/lib/diagnostic/
├── validation-rules.ts                # G1/G2/G3/G4 validation logic
├── schedule-calculator.ts             # Schedule deviation calculations
├── medical-indicators.ts              # Medical flag checks
├── food-classifier.ts                 # AI food classification
└── environmental-checker.ts           # Environmental validations

/app/api/admin/
├── diagnostic-validation/route.ts     # Main validation endpoint
├── diagnostic-ai-summary/route.ts     # AI analysis endpoint
└── diagnostic-events/route.ts         # Filtered events for diagnostics
```

---

## 8. Critical Gotchas & Mistakes to Avoid

### Gotcha 1: Timezone Handling in Event Comparisons

**Problem:** Events store ISO strings with offsets. Comparing times without accounting for timezone causes ±1 hour errors.

**Solution:** Use `/lib/datetime.ts` functions:
```typescript
import { buildLocalDate, dateToTimestamp } from "@/lib/datetime"

// Wrong
const planned = new Date("2025-01-27T08:00")  // UTC midnight!

// Correct
const planned = buildLocalDate("2025-01-27", "08:00")
```

**For Diagnostic Panel:**
- All schedule comparisons must convert to child's timezone
- Store timezone from user profile or survey
- Use consistent timezone for deviation calculations

---

### Gotcha 2: Event Type Variants (Legacy `night_feeding` vs Flag)

**Problem:** `night_feeding` exists as legacy type, but new events use `feeding` with `isNightFeeding` flag.

**Solution:** Handle both:
```typescript
const isNightFeedingEvent = (event) =>
  event.eventType === "night_feeding" ||  // Legacy
  (event.eventType === "feeding" && event.isNightFeeding === true)
```

**For Diagnostic Panel:**
- Count both types when validating night feeding frequency
- Don't create new `night_feeding` events
- Use flag-based approach in new code

---

### Gotcha 3: Survey Data Doesn't Exist Until Completed

**Problem:** Accessing `child.surveyData.responses.fieldName` crashes if survey not completed.

**Solution:** Defensive checks:
```typescript
const surveyResponses = child.surveyData?.responses || {}
const value = surveyResponses?.fieldName  // undefined, not error
```

**For Diagnostic Panel:**
- All G2 validation must handle `undefined` fields gracefully
- Show "pending from survey" for missing fields
- Don't block validation on missing data

---

### Gotcha 4: Child Must Have Active Plan

**Requirement:** Panel is blocked without active plan.

**Solution:** Check prerequisite:
```typescript
if (!child.activePlan?.status === 'active') {
  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardContent className="p-6">
        <AlertCircle className="h-6 w-6 text-yellow-600 mb-2" />
        <h3>Panel Bloqueado</h3>
        <p>Este niño debe tener un plan activo para usar el panel de diagnóstico.</p>
      </CardContent>
    </Card>
  )
}
```

**For Diagnostic Panel:**
- Check `child.activePlan` before rendering validation groups
- Show clear message if no active plan
- Provide button to create/activate plan

---

### Gotcha 5: Modal State Management with Selected Item

**Problem:** Modal stays open after navigation, confusing UX.

**Solution:** Close modal on action:
```typescript
const handleNavigateToEvents = () => {
  router.push(`/dashboard/calendar?childId=${childId}&date=${date}`)
  setSelectedAlert(null)  // Close modal
}
```

**For Diagnostic Panel:**
- Close alert modal after "View in calendar" navigation
- Reset selected state in cleanup
- Use `Dialog` component's controlled state

---

## 9. Validation Logic - Quick Reference

### G1 Schedule Tolerance
```
±15 minutes on:
- Sleep time (from plan)
- Wake time (from plan)
- Nap times (start and end)

Minimum wake time: 6:00 AM
Night duration: 11 hrs until age 2.5, then ±30 min/year
```

### G2 Medical - Threshold
```
1 indicator detected = alert
Examples:
- Reflujo + percentil bajo + congestión = 3 indicators → alert
- Only alergias mentioned = 1 indicator → alert
```

### G3 Food Classification
```
AI classifies in real-time (text from notes)
Fallback: save without classification if AI fails
Frequency validation: age-based expectations
```

### G4 Environmental
```
Check: temperature, humidity, light, noise, bed type
~90% of data available in initial survey
```

---

## 10. References to Key Files

| File | Purpose | Key Pattern |
|------|---------|------------|
| `/components/dashboard/AdminStatistics.tsx` | Admin dashboard with triaging | Tab organization, color system, metrics aggregation |
| `/docs/dev-qa/SPEC-SPRINT.md` | Full diagnostic panel spec | Validation rules, UI layout, deep-linking |
| `/docs/EVENT_REGISTRATION_SYSTEM.md` | Event types & structure | Sleep sessions vs events, field definitions |
| `/lib/datetime.ts` | Timezone-safe date handling | Defensive date comparisons |
| `/components/events/types.ts` | Event interfaces | EventType definitions |
| `/lib/auth-helpers.ts` | Role-based access | Admin checks |

---

## Summary: Top 5 Principles for Success

1. **Defensive Everything:** Survey fields don't exist → use optional chaining, defaults
2. **Server-Side Aggregation:** Don't calculate on client → create API endpoint for validation
3. **Prerequisite Checks:** Child must have active plan → block UI if missing
4. **Timezone Safety:** Always use `/lib/datetime.ts` → never raw Date() with ISO strings
5. **Admin-Only, Deep-Linking:** Use role checks + query params for navigation → clear access control + trackable UX

---

**Document Reviewed By:** Institutional Knowledge Search
**Last Updated:** 2026-02-03
