# Feature Specification: Dark mode toggle

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch theme (Priority: P1)

A user flips a toggle in settings to use a dark theme.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** switch theme works.

### Edge Cases

- What happens when the OS theme changes while the app is open?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST offer a light/dark toggle in settings.
- **FR-002**: System MUST remember the choice on this device.
- **FR-003**: System MUST apply the theme without a reload.

### Key Entities

- **Theme preference**: light or dark

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.
