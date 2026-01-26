# Workflow Phases - Detailed Guide

## Phase 1: Intake (Receive PM Spec)

### Trigger
- User mentions SPEC-SPRINT.md
- User says "specs from PM" or similar

### Process

1. **Read the spec file:**
   ```
   Read docs/dev-qa/SPEC-SPRINT.md
   ```

2. **Identify PM sections:**
   - Look for non-technical language
   - Business requirements
   - User stories
   - Feature descriptions

3. **Interview with AskUserQuestion:**
   - Clarify ambiguous requirements
   - Understand priority
   - Identify edge cases
   - Confirm scope

4. **Explore codebase:**
   - Find related files
   - Understand existing patterns
   - Identify dependencies

---

## Phase 2: Technical Specification

### Output Format

Transform PM spec into technical spec with these sections:

```markdown
## Technical Specification

### Files to Modify
| File | Change |
|------|--------|
| path/to/file.tsx | Description of change |

### Technical Logic
[Step by step implementation details]

### Database Changes
[If applicable - schema changes, migrations]

### API Changes
[If applicable - new endpoints, modified responses]

### Test Cases
1. [Test case 1]
2. [Test case 2]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### Key Principles
- Be specific about file paths
- Include code snippets where helpful
- Reference existing patterns in codebase
- Consider edge cases

---

## Phase 3: Implementation

### Process

1. **Create TodoWrite plan:**
   - Break into small, atomic tasks
   - Each task should be completable in one step
   - Include testing tasks

2. **Implement step by step:**
   - Mark task as `in_progress` before starting
   - Mark as `completed` immediately after finishing
   - Only one task `in_progress` at a time

3. **Checkpoint after each task:**
   - Summarize what was done
   - Show key code changes
   - Wait for user confirmation if needed

4. **Handle blockers:**
   - If stuck, explain the issue
   - Propose alternatives
   - Ask for guidance

---

## Phase 4: Testing

### Tools Available

| Tool | Purpose |
|------|---------|
| Claude-in-Chrome MCP | Browser automation, UI testing |
| Playwright MCP | Automated browser tests |
| MongoDB/Supabase MCP | Database verification |

### Testing Process

1. **UI Testing:**
   - Navigate to relevant pages
   - Perform user actions
   - Verify visual results
   - Take screenshots if needed

2. **Database Testing:**
   - Query to verify data changes
   - Check data integrity
   - Verify relationships

3. **Checkpoint per test:**
   - Report result (pass/fail)
   - Include evidence (screenshot, query result)
   - Wait for user confirmation

---

## Phase 5: Release Notes

### File: `docs/dev-qa/QA_RELEASE_NOTES.md`

### Key Rule: REPLACE, Don't Accumulate

**IMPORTANT:** Each sprint, REPLACE the entire QA_RELEASE_NOTES with tests for the CURRENT sprint only.
- Read SPEC-SPRINT.md to find all completed items
- Each completed item = 1 TEST section
- Delete old tests from previous sprints (keeps file clean and focused)

### Format

```markdown
# QA Release Notes

**Date:** YYYY-MM-DD
**URL:** http://localhost:3000

---

## Summary of Changes

| Change | Description |
|--------|-------------|
| Feature X | What it does |
| Fix Y | What was fixed |

---

## TEST 1: [Test Name]

**Route:** `/path/to/page`

**Steps:**
1. Login as [user type]
2. Navigate to [location]
3. Perform [action]

**Verify:**
- [ ] Expected result 1
- [ ] Expected result 2

---

## Testing Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password |
| User | user@example.com | password |
```

---

## Phase 6: Push and Merge to QA

### Commands

```bash
# Commit changes
git add .
git commit -m "feat(scope): description

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to dev
git push origin dev

# Merge to QA
git checkout QA
git pull origin QA
git merge dev -m "merge(QA): integrate [feature/fix description]"
git push origin QA

# Return to dev
git checkout dev
```

### Notify User
"Changes pushed to QA branch. Ready for Julio to test."

---

## Phase 7: Process QA Feedback

### Input: `docs/dev-qa/QA_FEEDBACK_NOTES.md`
### Output: `docs/dev-qa/DEV_FEEDBACK_REPORT.md`

### Analysis Process

1. **Read each note**
2. **Classify by type:**
   - Bug (functionality broken)
   - UX (works but confusing)
   - Visual (styling issue)
   - Feature request (new functionality)

3. **Assign priority:**
   - Critical: Blocks core functionality
   - High: Bad UX but works
   - Medium: Visual/minor issues
   - Low: Nice-to-have

4. **Create ticket for each:**
   ```markdown
   ## TICKET #N: [Title]

   **Priority:** [Critical|High|Medium|Low]
   **Component:** [file path]
   **Type:** [Bug|UX|Visual|Feature]

   ### Description
   [What the tester reported]

   ### Analysis
   [Technical analysis of the issue]

   ### Solution
   [Proposed fix]

   ### Files to Modify
   - [file paths]

   ### Acceptance Criteria
   - [ ] [criterion]
   ```

5. **Recommend action:**
   - Critical/High: Must fix before merge
   - Medium/Low: Can merge, add to backlog

---

## Phase 8: PR to Main

### Pre-requisites
- All Critical/High issues resolved
- QA has approved

### Research Commands

```bash
# List all commits in PR
git log main..QA --oneline

# See file changes
git diff main..QA --stat

# See detailed changes
git diff main..QA
```

### Create PR

```bash
gh pr create --base main --head QA \
  --title "Release: [Sprint Name/Date]" \
  --body "$(cat <<'EOF'
[PR body from template]
EOF
)"
```

### After PR Created
- Share PR URL with user
- Wait for review/approval
- Merge when approved
