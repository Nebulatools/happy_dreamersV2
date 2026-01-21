---
name: devops-workflow
description: |
  Sprint-based DevOps workflow for teams with PM specs, development, QA testing, and documented PRs.
  Use when working with dev-qa docs, processing QA feedback, creating release notes, or making PRs to main.
  Triggers on mentions of: SPEC-SPRINT, QA_RELEASE_NOTES, QA_FEEDBACK_NOTES, DEV_FEEDBACK_REPORT, or dev-qa folder.
---

# DevOps Workflow Skill

## About This Skill

Sprint-based development workflow that handles the full cycle from PM specs to production release.
This skill is **reusable across projects** - configure paths and branches as needed.

## When This Skill Activates

- Mention any file in `docs/dev-qa/`
- Mention SPEC-SPRINT, QA_RELEASE_NOTES, QA_FEEDBACK_NOTES, or DEV_FEEDBACK_REPORT
- Request to process QA feedback
- Request to create a PR to main

---

## Team Roles

| Role | Person | Branch | Responsibility |
|------|--------|--------|----------------|
| Product Manager | Andres | N/A | Creates specs in Gemini (external) |
| Developer | Roger | `dev` | Implements with Claude |
| QA Tester | Julio | `QA` | Manual testing and notes |

---

## Workflow Documents

| File | Purpose | Written By |
|------|---------|------------|
| `docs/dev-qa/SPEC-SPRINT.md` | PM input + Technical spec | PM -> Claude |
| `docs/dev-qa/QA_RELEASE_NOTES.md` | Tests for QA tester | Claude |
| `docs/dev-qa/QA_FEEDBACK_NOTES.md` | Manual QA notes | Julio |
| `docs/dev-qa/DEV_FEEDBACK_REPORT.md` | Prioritized tickets | Claude |

---

## Workflow Overview (16 Steps)

```
[1] PM creates specs in Gemini (non-technical)
[2] PM freezes and delivers markdown to Dev
[3] Dev adds markdown to docs/dev-qa/SPEC-SPRINT.md
[4] Claude reads SPEC-SPRINT + interviews with AskUserQuestion
[5] Claude transforms PM spec -> technical spec (overwrites SPEC-SPRINT.md)
[6] Implementation step by step with checkpoints
[7] Automated testing (Playwright/Chrome + MongoDB)
[8] Update QA_RELEASE_NOTES.md with tests
[9] git push dev && merge to QA
[10] QA tester does manual testing from QA branch
[11] QA creates notes in QA_FEEDBACK_NOTES.md
[12] Claude analyzes notes -> creates DEV_FEEDBACK_REPORT.md
[13] If critical: iterate. If minor: merge to main + backlog
[14] QA clean -> Create PR from QA to main (NO direct merge)
[15] Claude generates PR documentation (commits + decisions)
[16] PR approved -> merge to main
```

---

## Quick Commands by Phase

### Phase 1-2: Intake & Technical Spec

**Trigger:** "Process the PM spec" or mention SPEC-SPRINT.md

**Actions:**
1. Read `docs/dev-qa/SPEC-SPRINT.md`
2. Identify non-technical sections (PM input)
3. Use AskUserQuestion to clarify ambiguities
4. Explore codebase for technical context
5. Transform to technical spec with:
   - Files to modify
   - Technical logic
   - Test cases
   - Acceptance criteria
6. Overwrite SPEC-SPRINT.md with technical version

### Phase 3-4: Implementation & Testing

**Actions:**
1. Create plan with TodoWrite
2. Implement step by step
3. Checkpoint after each task for user verification
4. Run automated tests (Playwright/Chrome + MongoDB)
5. Document test results

### Phase 5-6: Release Notes & Push to QA

**Actions:**
1. Read existing format of `QA_RELEASE_NOTES.md`
2. Add new tests following the format
3. Include:
   - Summary of changes
   - Verification steps (checkboxes)
   - Modified files
   - Testing credentials
4. Commit with descriptive message
5. Push and merge:
   ```bash
   git push origin dev
   git checkout QA && git merge dev && git push origin QA
   ```
6. Notify that it's ready for QA

### Phase 7: Process QA Feedback

**Trigger:** "Process QA feedback" or mention QA_FEEDBACK_NOTES.md

**Actions:**
1. Read notes from `QA_FEEDBACK_NOTES.md`
2. Analyze each note
3. Create prioritized tickets in `DEV_FEEDBACK_REPORT.md`
4. Categorize: Critical | High | Medium | Low
5. Recommend: Iterate vs Merge + Backlog

### Phase 8: PR to Main

**Trigger:** "Create PR to main" or "QA approved"

**Actions:**
1. Research ALL commits:
   ```bash
   git log main..QA --oneline
   git diff main..QA --stat
   ```
2. Gather info from docs/dev-qa/:
   - SPEC-SPRINT.md (implemented specs)
   - QA_RELEASE_NOTES.md (tests and verifications)
   - DEV_FEEDBACK_REPORT.md (resolved issues)
3. Create PR with complete documentation:
   ```bash
   gh pr create --base main --head QA --title "..." --body "..."
   ```
4. Use template from `references/pr-template.md`
5. Notify user with PR URL

---

## Prioritization Rules

| Priority | Criteria | Action |
|----------|----------|--------|
| Critical | Bug blocks core functionality | Iterate before merge |
| High | Bad UX but functional | Evaluate with user |
| Medium | Visual improvements | Merge + backlog |
| Low | Nice-to-have | Backlog |

**Merge Rule:**
- Only Medium/Low issues -> merge to main + add to backlog
- Any Critical/High issues -> iterate until resolved

---

## Deep References

For detailed information, read:

- `references/workflow-phases.md` - Detailed phase descriptions
- `references/pr-template.md` - Complete PR body template

---

## Configuration (For Other Projects)

To use this workflow in another project, update these paths:

```yaml
docs_path: docs/dev-qa/          # Where workflow docs live
dev_branch: dev                   # Development branch
qa_branch: QA                     # QA testing branch
main_branch: main                 # Production branch
```
