# Feature Specification: Real-time team chat

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send messages (Priority: P1)

Members send messages in channels in real time.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** send messages works.

### User Story 2 - Direct messages (Priority: P2)

Members talk one to one.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** direct messages works.

### User Story 3 - Notifications (Priority: P3)

Members get push notifications when mentioned.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** notifications works.

### User Story 4 - Search (Priority: P4)

Members search message history.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** search works.

### User Story 5 - Files (Priority: P5)

Members share files in chat.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** files works.

### Edge Cases

- What happens when a member is offline for days?
- What happens with very large channels?
- What happens when push delivery fails?
- What happens when a file fails the scan?
- What happens when a message is edited during a reply?
- What happens on network flapping?
- What happens when a bot floods a channel?
- What happens when retention deletes a thread mid-read?
- What happens on SSO outage?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST deliver messages in real time over websockets.
- **FR-002**: System MUST keep message order per channel.
- **FR-003**: System MUST show typing indicators.
- **FR-004**: System MUST show read receipts.
- **FR-005**: System MUST support direct messages.
- **FR-006**: System MUST support channels with roles.
- **FR-007**: System MUST send push notifications to mobile.
- **FR-008**: System MUST send email digests.
- **FR-009**: System MUST support mentions.
- **FR-010**: System MUST support threads.
- **FR-011**: System MUST support reactions.
- **FR-012**: System MUST edit and delete messages.
- **FR-013**: System MUST search history.
- **FR-014**: System MUST upload files to object storage.
- **FR-015**: System MUST scan files for malware.
- **FR-016**: System MUST preview images.
- **FR-017**: System MUST sync across devices.
- **FR-018**: System MUST work offline and resend.
- **FR-019**: System MUST rate-limit spam.
- **FR-020**: System MUST moderate reported messages.
- **FR-021**: System MUST retain messages per policy.
- **FR-022**: System MUST export a channel.
- **FR-023**: System MUST integrate with SSO.
- **FR-024**: System MUST expose a REST API for bots.
- **FR-025**: System MUST deliver bot events via webhook.

### Key Entities

- **Channel**: name, members, roles
- **Message**: author, body, thread, edits
- **Member**: user, presence
- **Attachment**: file, scan status
- **Notification**: target, channel
- **Bot**: token, scopes
- **Report**: message, reason, status

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.

## Notes

Retention period: TBD. Message size limit [NEEDS CLARIFICATION: max characters?]
