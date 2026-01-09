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
| `/components/events/types.ts` | Event interfaces and EditOptions |
| `/components/events/EventEditRouter.tsx` | Centralized edit modal router |
| `/app/api/children/events/route.ts` | Event CRUD API |

### Key Imports
```typescript
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import { EventType, EventData, EditOptions } from "@/components/events/types"
import { useUser } from "@/context/UserContext"
```

## Deep Context References

For detailed information, read the following reference files:

- `references/datetime-patterns.md` - UTC bug details and timezone handling
- `references/event-system.md` - Event types, validation, and flags
- `references/modal-patterns.md` - Modal implementation with edit mode

## Known Critical Bugs

### UTC Date Interpretation Bug
**Problem**: `new Date("2026-01-07")` interprets as UTC midnight, causing date shift.
**Solution**: ALWAYS use `buildLocalDate(dateString, timeString)` instead.

### Event Type Duplication Bug
**Problem**: Creating separate event types for variants (e.g., `night_feeding`) causes duplicates.
**Solution**: Use boolean flags on existing types (e.g., `isNightFeeding: true` on `feeding`).

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
