# Feature Specification: CSV export of monthly reports

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export a report (Priority: P1)

A manager downloads the monthly report as CSV.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** export a report works.

### User Story 2 - Choose columns (Priority: P2)

A manager picks which columns to include.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** choose columns works.

### User Story 3 - Scheduled export (Priority: P3)

A manager receives the export by email every month.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** scheduled export works.

### Edge Cases

- What happens when the report is empty?
- What happens when the email bounces?
- What happens when columns are removed from the report later?
- What happens when two exports run at once?
- What happens above the row limit?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST export the monthly report as CSV.
- **FR-002**: System MUST let users choose columns.
- **FR-003**: System MUST remember the last column choice.
- **FR-004**: System MUST include a header row.
- **FR-005**: System MUST use UTF-8 with BOM for spreadsheet compatibility.
- **FR-006**: System MUST escape separators inside values.
- **FR-007**: System MUST limit an export to 100k rows.
- **FR-008**: System MUST email the scheduled export to the manager.
- **FR-009**: System MUST let managers cancel the schedule.
- **FR-010**: System MUST log each export for auditing.
- **FR-011**: System MUST respect the user's report permissions.
- **FR-012**: System MUST show export progress for large files.

### Key Entities

- **Report**: period, rows, owner
- **Export job**: columns, status, requested by
- **Schedule**: recipient, day of month
- **Audit entry**: who, when, which report

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.

## Notes

Delivery uses the existing email service. The retention period of audit entries is TBD.
