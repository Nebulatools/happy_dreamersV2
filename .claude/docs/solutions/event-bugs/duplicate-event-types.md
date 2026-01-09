---
title: Duplicate Event Types Anti-Pattern
category: event-bugs
date: 2026-01-09
severity: high
tags: events, night_feeding, isNightFeeding, flags, duplication
---

# Duplicate Event Types Anti-Pattern

## Problem

Creating separate `eventType` values for event variants (e.g., `night_feeding` as separate type from `feeding`) caused data inconsistencies and duplication bugs.

When a night feeding was created:
1. A `feeding` event was created
2. A separate `night_feeding` event was also created
3. Editing one didn't update the other
4. Analytics double-counted the feeding

## Cause

The original implementation treated night feedings as a distinct event type:

```typescript
// WRONG APPROACH
if (babyState === "asleep" && feedingType === "bottle") {
  await createEvent({ eventType: "night_feeding", ...data })
}
await createEvent({ eventType: "feeding", ...data })
```

This violated the single-source-of-truth principle where `events` collection should have one event per real-world activity.

## Solution

Use boolean flags on the base event type instead:

```typescript
// CORRECT APPROACH
await createEvent({
  eventType: "feeding",
  isNightFeeding: babyState === "asleep" && feedingType !== "solids",
  feedingContext: babyState === "asleep" ? "during_sleep" : "awake",
  ...feedingData
})
```

### Schema Change

```typescript
interface FeedingEvent {
  eventType: "feeding"
  feedingType: "breast" | "bottle" | "solids"
  feedingAmount?: number
  feedingDuration?: number
  babyState: "awake" | "asleep"

  // NEW FLAGS instead of separate event types
  isNightFeeding?: boolean
  feedingContext?: "awake" | "during_sleep" | "after_waking"
}
```

### Legacy Support

The `night_feeding` type still exists in historical data. UI detects it:

```typescript
const isNightFeedingEvent = (event: EventData): boolean => {
  return (
    event.eventType === "night_feeding" ||  // Legacy
    (event.eventType === "feeding" && event.isNightFeeding === true)
  )
}
```

## Files Changed

1. `/components/events/types.ts` - Added `isNightFeeding` flag
2. `/components/events/FeedingModal.tsx` - Sets flag instead of separate type
3. `/app/api/children/events/route.ts` - Validates and stores flag
4. `/components/events/EventEditRouter.tsx` - Handles legacy `night_feeding`

## Prevention

Before creating a new `eventType`:

1. **Ask**: "Is this a variant of an existing type?"
2. **If yes**: Add a boolean flag to the existing type
3. **If no**: Create new type only if fundamentally different behavior

### Decision Tree

```
New event behavior needed?
├── Is it a variation of existing type?
│   ├── YES → Add boolean flag (e.g., isNightFeeding)
│   └── NO → Is behavior fundamentally different?
│       ├── YES → Create new eventType
│       └── NO → Reconsider - probably needs a flag
```

## Detection

Look for these patterns that might indicate duplication:
- Multiple event types with similar names (e.g., `feeding`, `night_feeding`)
- Events being created in pairs
- Analytics that need to merge/dedupe similar events
