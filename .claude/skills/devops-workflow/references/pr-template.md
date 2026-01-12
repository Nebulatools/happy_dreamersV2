# PR Template for Main Branch

Use this template when creating PRs from QA to main.

---

## Template

```markdown
## Sprint Summary

[High-level description of what was implemented in this sprint. 2-3 sentences max.]

---

## Main Changes

### Features
- **[Feature Name]**: [Brief description of what it does]
- **[Feature Name]**: [Brief description]

### Fixes
- **[Fix Name]**: [What was broken and how it was fixed]

### Improvements
- **[Improvement]**: [What was improved]

---

## Technical Decisions

| Decision | Justification |
|----------|---------------|
| [What was decided] | [Why this approach was chosen] |
| [Architecture choice] | [Trade-offs considered] |

---

## Commits Included

| Commit | Type | Description |
|--------|------|-------------|
| `abc1234` | feat | [Description] |
| `def5678` | fix | [Description] |
| `ghi9012` | refactor | [Description] |

<details>
<summary>Full commit list</summary>

[Output of `git log main..QA --oneline`]

</details>

---

## Files Modified

### New Files
- `path/to/new/file.tsx` - [Purpose]

### Modified Files
- `path/to/modified.tsx` - [What changed]

### Deleted Files
- `path/to/deleted.tsx` - [Why removed]

<details>
<summary>Full file list</summary>

[Output of `git diff main..QA --stat`]

</details>

---

## Testing Performed

### Automated Testing
- [x] Unit tests passing
- [x] Integration tests passing
- [ ] E2E tests (if applicable)

### Manual QA Testing
- [x] QA tester (Julio) verified functionality
- [x] All Critical/High issues resolved
- [x] Release notes followed

### Test Coverage
| Area | Status |
|------|--------|
| [Feature 1] | Tested |
| [Feature 2] | Tested |
| [Edge case] | Tested |

---

## Related Documentation

- [SPEC-SPRINT.md](docs/dev-qa/SPEC-SPRINT.md) - Technical specifications
- [QA_RELEASE_NOTES.md](docs/dev-qa/QA_RELEASE_NOTES.md) - Test cases for QA
- [DEV_FEEDBACK_REPORT.md](docs/dev-qa/DEV_FEEDBACK_REPORT.md) - Resolved QA feedback

---

## Deployment Notes

### Pre-deployment
- [ ] Database migrations (if any)
- [ ] Environment variables (if any)
- [ ] Dependencies updated

### Post-deployment
- [ ] Verify production works
- [ ] Monitor for errors

---

## Reviewer Notes

[Any specific things the reviewer should pay attention to, potential risks, or areas of uncertainty]

---

Generated with Claude Code
```

---

## How to Use

1. **Run research commands:**
   ```bash
   git log main..QA --oneline > /tmp/commits.txt
   git diff main..QA --stat > /tmp/files.txt
   ```

2. **Read workflow docs:**
   - docs/dev-qa/SPEC-SPRINT.md
   - docs/dev-qa/QA_RELEASE_NOTES.md
   - docs/dev-qa/DEV_FEEDBACK_REPORT.md

3. **Fill template sections:**
   - Summarize from SPEC-SPRINT.md
   - List commits from git log
   - List files from git diff
   - Note testing from QA_RELEASE_NOTES.md

4. **Create PR:**
   ```bash
   gh pr create --base main --head QA \
     --title "Release: [Sprint Name]" \
     --body "[filled template]"
   ```

---

## Tips

- Keep summaries concise (2-3 sentences)
- Use collapsible `<details>` for long lists
- Link to documentation files
- Highlight breaking changes prominently
- Note any manual steps required for deployment
