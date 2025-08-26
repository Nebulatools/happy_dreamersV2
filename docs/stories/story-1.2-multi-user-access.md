# Story 1.2: Multi-User Child Access System

## Status: Draft

## Story
As a parent managing childcare with my partner and babysitter,
I want to grant access to my child's sleep profile to other trusted caregivers,
so that anyone caring for my child can view sleep patterns and log events consistently.

## Acceptance Criteria
1. Primary parent can add other users (email-based) to access specific child profiles
2. Added caregivers can view child's sleep history and current plan without accessing other family data
3. All authorized users can log sleep events that sync in real-time across accounts
4. Primary parent can remove access permissions at any time
5. Clear visual indicators show which caregivers have access to each child

## Integration Verification
- **IV1**: Existing single-parent workflows continue to function without any changes for users who don't use multi-access
- **IV2**: Current family and child data structures remain intact with only additive schema changes
- **IV3**: Session management maintains current security standards while supporting multi-user access

## Dev Notes
- Implement new UserChildAccess collection in MongoDB
- Extend existing authentication to support multi-user permissions
- Use NextAuth.js session callbacks for permission checking
- Maintain backward compatibility with single-user accounts

## Tasks

### Task 1: Database Schema Extension
- [ ] Create UserChildAccess schema with userId, childId, permissions, and role fields
- [ ] Add 'sharedWith' array field to existing Child model
- [ ] Create indexes for efficient permission lookups
- [ ] Implement migration script for existing data
- [ ] Add audit fields (createdAt, updatedAt, invitedBy)

### Task 2: API Endpoints for Access Management
- [ ] Create POST /api/children/[childId]/access endpoint for adding caregivers
- [ ] Create GET /api/children/[childId]/access endpoint for listing caregivers
- [ ] Create DELETE /api/children/[childId]/access/[userId] for removing access
- [ ] Create PUT /api/children/[childId]/access/[userId] for updating permissions
- [ ] Add permission checks to all existing child-related endpoints

### Task 3: Invitation System Implementation
- [ ] Create email invitation functionality using existing email service
- [ ] Generate secure invitation tokens with expiration
- [ ] Create invitation acceptance flow for new users
- [ ] Handle existing user invitation flow
- [ ] Implement invitation status tracking (pending, accepted, rejected)

### Task 4: Permission Management UI
- [ ] Create caregiver management interface in child settings
- [ ] Build email invitation form with role selection
- [ ] Display list of current caregivers with roles
- [ ] Implement remove caregiver functionality
- [ ] Add permission level selector (view-only, can-log-events, full-access)

### Task 5: Multi-User Session Management
- [ ] Extend NextAuth session to include child access permissions
- [ ] Implement permission checking middleware
- [ ] Create helper functions for permission validation
- [ ] Handle session updates when permissions change
- [ ] Implement real-time permission revocation

### Task 6: Child Selector Enhancement
- [ ] Update child selector to show all accessible children
- [ ] Add visual indicators for owned vs shared children
- [ ] Implement filtering by ownership type
- [ ] Show caregiver role next to child name
- [ ] Handle child switching with proper permission checks

### Task 7: Real-Time Synchronization
- [ ] Implement WebSocket or Server-Sent Events for real-time updates
- [ ] Sync sleep events across all connected caregivers
- [ ] Update UI when permissions change
- [ ] Handle offline/online synchronization
- [ ] Implement conflict resolution for simultaneous edits

### Task 8: Security and Privacy Implementation
- [ ] Implement row-level security for multi-user access
- [ ] Add audit logging for all access changes
- [ ] Prevent data leakage between families
- [ ] Implement rate limiting for invitation endpoints
- [ ] Add two-factor authentication for permission changes

## Testing

### Unit Tests
- Permission validation logic tests
- Database schema and query tests
- Invitation token generation and validation
- Session management with multiple children

### Integration Tests
- Multi-user authentication flow
- Permission inheritance and cascading
- Real-time synchronization between users
- Invitation acceptance process

### E2E Tests
- Complete caregiver invitation and acceptance flow
- Multi-user event logging and viewing
- Permission revocation and immediate effect
- Cross-account data isolation

### Security Tests
- [ ] Attempt unauthorized child access
- [ ] Test permission escalation attempts
- [ ] Verify data isolation between families
- [ ] Test invitation token security
- [ ] Validate session hijacking prevention

## Dev Agent Record

### Agent Model Used
- Model: [Pending]
- Date Started: [Pending]
- Date Completed: [Pending]

### Debug Log References
- See: `.ai/debug-log.md` for detailed implementation notes

### Completion Notes
- [ ] All acceptance criteria met
- [ ] Security review completed
- [ ] Multi-user flows tested
- [ ] Backward compatibility verified
- [ ] Performance impact assessed

### File List
<!-- List all files created or modified during implementation -->
- [ ] Files to be modified will be listed here during implementation

### Change Log
<!-- Document significant changes made during implementation -->
- [Pending implementation]