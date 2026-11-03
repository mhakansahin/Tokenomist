# Feature Specification: Multi-tenant subscription billing

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a plan (Priority: P1)

An admin picks a plan for the organisation.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** choose a plan works.

### User Story 2 - Pay (Priority: P2)

An admin pays by card via Stripe.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** pay works.

### User Story 3 - Invoices (Priority: P3)

An accountant downloads invoices.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** invoices works.

### User Story 4 - Seats (Priority: P4)

An admin adds and removes seats with proration.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** seats works.

### User Story 5 - Dunning (Priority: P5)

Failed payments are retried and admins are warned.

**Acceptance Scenarios**:

1. **Given** the feature exists, **When** the user acts, **Then** dunning works.

### Edge Cases

- What happens when a webhook arrives twice?
- What happens when a webhook arrives out of order?
- What happens when VAT validation is down?
- What happens when a card expires mid-period?
- What happens when seats drop below usage?
- What happens when currency differs per tenant?
- What happens when a refund is issued after an invoice?
- What happens when a tenant is deleted with open invoices?
- What happens on a plan change during a trial?
- What happens when the payout report is late?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST list plans per tenant.
- **FR-002**: System MUST isolate tenant billing data.
- **FR-003**: System MUST create Stripe customers.
- **FR-004**: System MUST collect card payments via Stripe.
- **FR-005**: System MUST support 3-D Secure.
- **FR-006**: System MUST handle Stripe webhooks idempotently.
- **FR-007**: System MUST prorate seat changes.
- **FR-008**: System MUST issue invoices monthly.
- **FR-009**: System MUST issue invoices yearly.
- **FR-010**: System MUST apply VAT by country.
- **FR-011**: System MUST validate VAT ids with the EU service.
- **FR-012**: System MUST store invoices as PDF.
- **FR-013**: System MUST email invoices.
- **FR-014**: System MUST retry failed payments three times.
- **FR-015**: System MUST warn admins before suspension.
- **FR-016**: System MUST suspend tenants after the grace period.
- **FR-017**: System MUST restore tenants after payment.
- **FR-018**: System MUST allow plan upgrades.
- **FR-019**: System MUST allow plan downgrades at period end.
- **FR-020**: System MUST export billing data.
- **FR-021**: System MUST keep an audit log of billing events.
- **FR-022**: System MUST support coupons.
- **FR-023**: System MUST support trials.
- **FR-024**: System MUST reconcile payouts nightly.
- **FR-025**: System MUST expose billing status to the admin API.
- **FR-026**: System MUST show usage-based charges.

### Key Entities

- **Tenant**: name, country, VAT id
- **Plan**: price, interval, limits
- **Subscription**: tenant, plan, status, period
- **Seat**: user, tenant
- **Invoice**: number, lines, tax, pdf
- **Payment**: provider id, status, amount
- **Coupon**: code, discount, expiry
- **Billing event**: type, payload, processed

## Success Criteria *(mandatory)*

- **SC-001**: Users complete the task in under a minute.

## Notes

Refund rules [NEEDS CLARIFICATION: partial refunds allowed?] Tax rounding [NEEDS CLARIFICATION: per line or per invoice?] Uses payment provider APIs, a queue for webhooks, the database and the email service.
