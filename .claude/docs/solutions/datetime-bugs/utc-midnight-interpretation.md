---
title: UTC Midnight Interpretation Bug
category: datetime-bugs
date: 2026-01-09
severity: critical
tags: utc, timezone, date-parsing, buildLocalDate, edit-modal
---

# UTC Midnight Interpretation Bug

## Problem

When editing events and changing only the time, the date shifted back by one day. Users would edit an event from January 7th, change the time, and save - only to find the event moved to January 6th.

## Cause

JavaScript's `new Date()` interprets date-only strings as UTC midnight:

```typescript
// This is what was happening in the modals
const eventDate = "2026-01-07"  // from date input
const eventTime = "19:30"       // from time input

// BUG: This interprets "2026-01-07" as UTC midnight
const startDateTime = new Date(`${eventDate}T${eventTime}:00`)

// In Mexico (UTC-6):
// "2026-01-07T00:00:00Z" (UTC) = "2026-01-06T18:00:00-06:00" (local)
// Then setHours(19, 30) operates on January 6th, not January 7th!
```

The problem existed in multiple modals:
- `FeedingModal.tsx`
- `ExtraActivityModal.tsx`
- `NightWakingModal.tsx`
- `SleepDelayModal.tsx`
- `ManualEventModal.tsx`

## Solution

Created `buildLocalDate()` helper in `/lib/datetime.ts`:

```typescript
/**
 * Construye una fecha en zona horaria local desde inputs de formulario.
 * USAR SIEMPRE que se combine dateString (YYYY-MM-DD) + timeString (HH:mm)
 *
 * IMPORTANTE: NO usar new Date("YYYY-MM-DD") ni new Date(`${date}T${time}`)
 * porque JavaScript interpreta esos formatos como UTC.
 */
export function buildLocalDate(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split("-")
  const [hours, minutes] = timeString.split(":")
  return new Date(
    parseInt(year),
    parseInt(month) - 1,  // JavaScript months are 0-indexed
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    0, 0
  )
}
```

Updated all modals to use the pattern:

```typescript
// In modal handleConfirm
if (mode === "edit" && eventDate && eventTime) {
  const dateObj = buildLocalDate(eventDate, eventTime)
  editOptions = {
    startTime: dateToTimestamp(dateObj, userData?.timezone)
  }
}
```

## Files Changed

1. `/lib/datetime.ts` - Added `buildLocalDate()` function
2. `/components/events/FeedingModal.tsx` - Uses `buildLocalDate()`
3. `/components/events/ExtraActivityModal.tsx` - Uses `buildLocalDate()`
4. `/components/events/NightWakingModal.tsx` - Uses `buildLocalDate()`

## Prevention

1. **Added to `.claude/rules/datetime.md`** - Auto-loaded in every session
2. **Checklist in skill** - "Estoy usando buildLocalDate() para date+time?"
3. **Code review trigger** - Any `new Date()` with string argument should be flagged

## Detection

Look for these anti-patterns:
```typescript
// RED FLAGS - potential UTC bug
new Date("YYYY-MM-DD")
new Date(`${dateVar}T${timeVar}`)
new Date(dateString)
```

Replace with:
```typescript
// CORRECT
buildLocalDate(dateString, timeString)
```
