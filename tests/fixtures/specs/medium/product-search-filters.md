# Feature Specification: Product list search filters

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter by category (Priority: P1)

A shopper narrows products by category.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** filter by category works.

### User Story 2 - Filter by price (Priority: P2)

A shopper sets a price range.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** filter by price works.

### User Story 3 - Share filters (Priority: P3)

A shopper shares a link that keeps the filters.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** share filters works.

### Edge Cases

- What happens when a category is deleted?
- What happens with min price above max price?
- What happens when a shared link has unknown values?
- What happens when prices change while browsing?
- What happens with no products?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST filter products by category.
- **FR-002**: System MUST filter by price range.
- **FR-003**: System MUST combine filters.
- **FR-004**: System MUST show the result count.
- **FR-005**: System MUST keep filters in the URL.
- **FR-006**: System MUST restore filters from a shared link.
- **FR-007**: System MUST clear all filters with one action.
- **FR-008**: System MUST show an empty state with suggestions.
- **FR-009**: System MUST keep filters when paging.
- **FR-010**: System MUST respond within one second for 10k products.
- **FR-011**: System MUST work on mobile layouts.
- **FR-012**: System MUST read prices from the catalog API.

### Key Entities

- **Product**: category, price, stock
- **Category**: name, parent
- **Filter state**: selected values

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.
