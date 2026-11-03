# Feature Specification: Profile avatar upload

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload avatar (Priority: P1)

A user uploads a profile picture.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** upload avatar works.

### User Story 2 - Crop (Priority: P2)

A user crops the picture to a square.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** crop works.

### User Story 3 - Remove (Priority: P3)

A user removes the picture and returns to initials.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** remove works.

### Edge Cases

- What happens when upload is interrupted?
- What happens with a huge image?
- What happens with an animated image?
- What happens when storage is unavailable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept JPEG and PNG up to 5 MB.
- **FR-002**: System MUST let users crop to a square.
- **FR-003**: System MUST create small and large sizes.
- **FR-004**: System MUST store images in object storage.
- **FR-005**: System MUST show initials when no picture exists.
- **FR-006**: System MUST replace the old picture.
- **FR-007**: System MUST remove the picture on request.
- **FR-008**: System MUST strip location metadata.
- **FR-009**: System MUST show upload progress.
- **FR-010**: System MUST reject unsupported files with a message.
- **FR-011**: System MUST update the picture everywhere within a minute.

### Key Entities

- **Avatar**: owner, sizes, uploaded at
- **User profile**: name, initials, avatar
- **Upload**: file type, size, status

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.

## Notes

Images are served through a third-party image service.
