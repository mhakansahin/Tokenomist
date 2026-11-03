# Feature Specification: Password reset via email

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Request reset (Priority: P1)

A user asks for a reset link from the sign-in page.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** request reset works.

### User Story 2 - Set new password (Priority: P2)

A user opens the link and sets a new password.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** set new password works.

### User Story 3 - Notify (Priority: P3)

The user is told by email that the password changed.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** notify works.

### Edge Cases

- What happens when the link is opened twice?
- What happens when the email provider is down?
- What happens when the user changes email during a reset?
- What happens with many requests in a minute?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST send a reset link by email.
- **FR-002**: System MUST expire links after 30 minutes.
- **FR-003**: System MUST allow one use per link.
- **FR-004**: System MUST enforce the password policy.
- **FR-005**: System MUST sign out other sessions after a reset.
- **FR-006**: System MUST not reveal whether an email exists.
- **FR-007**: System MUST rate-limit reset requests.
- **FR-008**: System MUST send a confirmation email.
- **FR-009**: System MUST log reset events.
- **FR-010**: System MUST support both languages in emails.
- **FR-011**: System MUST show clear errors for expired links.

### Key Entities

- **Reset token**: user, expiry, used
- **User account**: email, password hash
- **Security event**: type, time, ip

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.

## Notes

Uses the database and the email delivery service.
