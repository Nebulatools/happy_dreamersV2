---
name: Happy Dreamers Development
description: |
  This skill should be used when working on the Happy Dreamers codebase - a child sleep tracking platform
  built with Next.js 15, React 19, MongoDB, and NextAuth. Use this skill for implementing features,
  fixing bugs, understanding patterns, and documenting new discoveries. The skill includes a compound
  mechanism to accumulate knowledge throughout development sessions.
---

# Happy Dreamers Development Skill

## About This Skill

Happy Dreamers is a comprehensive child sleep tracking and AI consultation platform. This skill provides:

1. **Project context** - Stack, patterns, and key files
2. **Bug prevention** - Known bugs and their solutions
3. **Implementation patterns** - Tested patterns for common tasks
4. **Compound mechanism** - System for documenting new discoveries

## When to Use This Skill

- Implementing any feature in the Happy Dreamers codebase
- Fixing bugs related to events, datetime, or UI
- Adding new modal components for event editing
- Working with the MongoDB events collection
- Handling timezone-sensitive operations

## Quick Reference

### Stack
- **Frontend**: Next.js 15, React 19, TypeScript 5
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: MongoDB 6.19
- **Auth**: NextAuth.js with JWT

### Critical Files
| File | Purpose |
|------|---------|
| `/lib/datetime.ts` | Timezone handling - ALWAYS use `buildLocalDate()` |
| `/lib/colors/event-colors.ts` | Centralized color system for events |
| `/lib/icons/event-icons.ts` | Centralized icon registry for events |
| `/lib/utils/calculate-event-columns.ts` | Column calculation for overlapping events |
| `/components/events/types.ts` | Event interfaces and EditOptions |
| `/components/events/EventEditRouter.tsx` | Centralized edit modal router |
| `/components/calendar/SleepSessionBlock.tsx` | Sleep block with internal events in columns |
| `/app/api/children/events/route.ts` | Event CRUD API |

### Key Imports
```typescript
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import { EventType, EventData, EditOptions } from "@/components/events/types"
import { useUser } from "@/context/UserContext"
import { getEventBgClass, getEventBlockClasses } from "@/lib/colors/event-colors"
import { getEventIconConfig } from "@/lib/icons/event-icons"
```

### Visual Taxonomy System

El sistema de taxonomía visual usa colores e iconos centralizados para diferenciar tipos de eventos.

**Colores por subtipo de alimentación:**
| Tipo | Color | Hex |
|------|-------|-----|
| Pecho | Rosa | `#EC4899` |
| Biberón | Cyan | `#0EA5E9` |
| Sólidos | Esmeralda | `#10B981` |

**Uso correcto:**
```typescript
// Para obtener clase de fondo
const bgClass = getEventBgClass(event.eventType, event.feedingType)

// Para obtener icono con su configuración
const config = getEventIconConfig(event.eventType, event.feedingType)
const IconComponent = config.icon

// IMPORTANTE: Iconos blancos sobre fondos de color
return <IconComponent className="w-3 h-3 text-white" />
```

**Regla crítica:** Los iconos sobre fondos de color SIEMPRE deben ser blancos (`text-white`) para buen contraste. NO usar `style={{ color: config.color }}` cuando hay fondo de color.

## Deep Context References

For detailed information, read the following reference files:

- `references/datetime-patterns.md` - UTC bug details and timezone handling
- `references/event-system.md` - Event types, validation, and flags
- `references/modal-patterns.md` - Modal implementation with edit mode
- `/lib/colors/event-colors.ts` - Color system (Single Source of Truth)
- `/lib/icons/event-icons.ts` - Icon registry (Single Source of Truth)

## Known Critical Bugs

### UTC Date Interpretation Bug
**Problem**: `new Date("2026-01-07")` interprets as UTC midnight, causing date shift.
**Solution**: ALWAYS use `buildLocalDate(dateString, timeString)` instead.

### Event Type Duplication Bug
**Problem**: Creating separate event types for variants (e.g., `night_feeding`) causes duplicates.
**Solution**: Use boolean flags on existing types (e.g., `isNightFeeding: true` on `feeding`).

### Inconsistent Visual Taxonomy Bug
**Problem**: Using local color/icon functions instead of centralized system causes inconsistency.
**Solution**: ALWAYS use `getEventBgClass()` and `getEventIconConfig()` from centralized files.
**Files affected**: Any component rendering events (calendar views, dashboards, lists).

### Icon Contrast Bug
**Problem**: Using `style={{ color: config.color }}` on icons over colored backgrounds makes them invisible.
**Solution**: Use `className="text-white"` for icons on colored backgrounds.

### Events Inside Sleep Block Overlap Bug
**Problem**: Events (night_waking, feeding, medication) occurring DURING a sleep block overlap visually.
**Cause**: `SleepSessionBlock` rendered `nightWakings` and `overlayEvents` separately without column calculation.
**Solution**: Combine both arrays into `allInternalEvents` and use `calculateEventColumns()` from shared utility.
**File**: `lib/utils/calculate-event-columns.ts` - shared column calculation algorithm.

```typescript
// In SleepSessionBlock.tsx
const allInternalEvents = useMemo(() => {
  const combined = [
    ...nightWakings.map(e => ({ ...e, _internalType: 'nightWaking' })),
    ...(overlayEvents || []).map(e => ({ ...e, _internalType: 'overlay' }))
  ]
  const withColumns = calculateEventColumns(combined)
  return filterVisibleEvents(withColumns, MAX_VISIBLE_OVERLAY_COLUMNS)
}, [nightWakings, overlayEvents])
```

---

# COMPOUND MECHANISM - CRITICAL

## Purpose

Accumulate valuable knowledge throughout development. When discovering bugs, patterns, or solutions,
document them immediately while context is fresh.

## When to Compound

Document a solution when ANY of these occur:

1. **Bug Fixed** - Non-obvious bug that could recur
2. **Pattern Discovered** - Reusable implementation pattern
3. **Gotcha Found** - Surprising behavior that wasted time
4. **Integration Learned** - How two systems interact

## How to Compound

### Step 1: Create Solution Document

Create a new file in the appropriate category:

```
.claude/docs/solutions/
├── datetime-bugs/     # Timezone, date parsing issues
├── event-bugs/        # Event system issues
├── ui-bugs/           # CSS, component issues
└── patterns/          # Reusable patterns
```

### Step 2: Use This Template

```markdown
---
title: [Descriptive title]
category: [datetime-bugs|event-bugs|ui-bugs|patterns]
date: [YYYY-MM-DD]
severity: [critical|high|medium|low]
tags: [comma, separated, tags]
---

# [Title]

## Problem
[What went wrong or what was discovered]

## Cause
[Root cause analysis]

## Solution
[How to fix or implement correctly]

## Code Example
\`\`\`typescript
// Correct implementation
\`\`\`

## Prevention
[How to avoid this in the future]
```

### Step 3: Update Rules if Critical

If the solution is critical (affects multiple places or is easy to repeat):

1. Add a concise rule to the appropriate `.claude/rules/*.md` file
2. Reference the full solution document for details

## Example Compound Entry

File: `.claude/docs/solutions/datetime-bugs/utc-midnight-bug.md`

```markdown
---
title: UTC Midnight Interpretation Bug
category: datetime-bugs
date: 2026-01-09
severity: critical
tags: utc, timezone, date-parsing, buildLocalDate
---

# UTC Midnight Interpretation Bug

## Problem
When editing events and changing only the time, the date shifted back by one day.

## Cause
JavaScript's `new Date("2026-01-07")` interprets the string as UTC midnight.
In Mexico (UTC-6), this becomes 2026-01-06T18:00 local time.

## Solution
Use `buildLocalDate()` from `/lib/datetime.ts`:

\`\`\`typescript
// WRONG - shifts date
const date = new Date(eventDate)

// CORRECT - preserves local date
const date = buildLocalDate(eventDate, eventTime)
\`\`\`

## Prevention
- ALWAYS use `buildLocalDate()` for date+time combinations
- NEVER use `new Date()` with date-only strings
- Added to `.claude/rules/datetime.md` for auto-loading
```

## Compounding Incentive

At the end of each session where bugs were fixed or patterns were discovered:

1. **Ask yourself**: "Did I learn something that would help future sessions?"
2. **If yes**: Create a compound document before session ends
3. **Update rules**: If it's critical, add a concise rule

This compounds knowledge over time, making future development faster and more reliable.

---

## Testing Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | mariana@admin.com | password |
| User | eljulius@nebulastudios.io | juls0925 |
