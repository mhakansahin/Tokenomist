# Feature Specification: Offline-first field inspection app

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect offline (Priority: P1)

An inspector fills forms without connectivity.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** inspect offline works.

### User Story 2 - Sync (Priority: P2)

Data syncs when back online.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** sync works.

### User Story 3 - Resolve conflicts (Priority: P3)

Supervisors resolve conflicting edits.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** resolve conflicts works.

### User Story 4 - Photos (Priority: P4)

Inspectors attach geotagged photos.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** photos works.

### User Story 5 - Reports (Priority: P5)

Managers get PDF reports.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** reports works.

### Edge Cases

- What happens when two inspectors edit the same inspection offline?
- What happens when a template changes mid-inspection?
- What happens when storage on the device is full?
- What happens when a device is lost?
- What happens when sync is interrupted?
- What happens with a photo without GPS?
- What happens when the ERP rejects data?
- What happens when a site is unassigned while offline?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store forms on the device.
- **FR-002**: System MUST work fully offline.
- **FR-003**: System MUST sync when online.
- **FR-004**: System MUST resolve conflicts per field.
- **FR-005**: System MUST show sync status.
- **FR-006**: System MUST queue photos for upload.
- **FR-007**: System MUST compress photos.
- **FR-008**: System MUST geotag photos with the maps service.
- **FR-009**: System MUST validate forms offline.
- **FR-010**: System MUST download assigned sites.
- **FR-011**: System MUST update form templates remotely.
- **FR-012**: System MUST version form templates.
- **FR-013**: System MUST generate PDF reports.
- **FR-014**: System MUST email reports to clients.
- **FR-015**: System MUST sign reports digitally.
- **FR-016**: System MUST support Android and iOS.
- **FR-017**: System MUST encrypt local data.
- **FR-018**: System MUST wipe data remotely.
- **FR-019**: System MUST log device activity.
- **FR-020**: System MUST integrate with the ERP via API.
- **FR-021**: System MUST import sites from CSV.
- **FR-022**: System MUST push assignment notifications.
- **FR-023**: System MUST support two languages.
- **FR-024**: System MUST measure sync duration.

### Key Entities

- **Site**: address, client, coordinates
- **Inspection**: site, inspector, answers, status
- **Form template**: fields, version
- **Photo**: inspection, location, upload state
- **Report**: inspection, pdf, signature
- **Device**: owner, last sync
- **Conflict**: field, versions, resolution

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.

## Notes

ERP field mapping [NEEDS CLARIFICATION: which ERP version?] Uses a queue for uploads and the database on the server.
