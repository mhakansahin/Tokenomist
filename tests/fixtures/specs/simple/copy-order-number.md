# Feature Specification: Copy order number

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy order number (Priority: P1)

A customer copies the order number with one click.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** copy order number works.

### Edge Cases

- What happens when clipboard access is denied?
- What happens with very long order numbers?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show a copy icon next to the order number.
- **FR-002**: System MUST copy the number to the clipboard.
- **FR-003**: System MUST show a short confirmation.
- **FR-004**: System MUST work with keyboard only.

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.
