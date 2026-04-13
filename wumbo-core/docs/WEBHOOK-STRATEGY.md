# Webhook Strategy

This document defines how `wumbo-core` should handle third-party webhooks such
as Stripe and Lob.

## Core Rule

External provider webhooks are inbound integration entrypoints.

They should:

1. verify the provider signature
2. dedupe the provider event delivery
3. translate the provider event into an internal command or use-case input
4. update `wumbo-core` state
5. write internal domain events to the outbox

They should not publish raw provider payloads directly onto the internal domain
event bus.

## Why

Stripe and Lob events are provider-specific integration events. They reflect the
provider's event model, payload shape, and delivery behavior.

`wumbo-core` should translate those into Wumbo-owned facts such as:

- `mailer-order-paid.v1`
- `mailer-order-submitted.v1`
- `mailer-order-mailed.v1`

That keeps downstream consumers coupled to Wumbo contracts instead of vendor
contracts.

## Recommended Flow

Use this pattern for webhook-driven state changes:

1. webhook handler receives the raw request
2. handler verifies the signature and rejects invalid requests
3. handler checks whether the webhook delivery was already processed
4. handler maps the provider event into a Wumbo command input
5. a domain use-case updates the database and writes an outbox event in the same transaction
6. the scheduled outbox publisher later publishes that domain event to EventBridge

This keeps:

- provider verification at the edge
- database writes in the use-case layer
- EventBridge publishing in the existing outbox pipeline

## Stripe Example

Suggested location:

```text
src/entrypoints/webhooks/stripe/
```

Suggested responsibilities:

- verify Stripe signature
- dedupe Stripe event delivery
- map events such as:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
- call a use-case such as `recordMailerOrderPaymentReceived`

That use-case should:

- load and validate the target order
- mark the order as paid
- persist relevant Stripe identifiers
- write `mailer-order-paid.v1` to the outbox

## Lob Example

Suggested location:

```text
src/entrypoints/webhooks/lob/
```

Suggested responsibilities:

- verify Lob signature and timestamp
- dedupe Lob webhook delivery
- map events such as:
  - `letter.created`
  - `letter.processed_for_delivery`
  - `letter.mailed`
- call use-cases such as:
  - `recordMailerOrderSubmitted`
  - `recordMailerOrderMailed`

Those use-cases should:

- update fulfillment state in the database
- persist relevant Lob identifiers and timestamps
- write Wumbo-owned fulfillment events to the outbox

## Ownership Guidance

Stripe webhooks belong in `wumbo-core` when `wumbo-core` owns:

- the order record
- payment state
- payment-received domain events

Lob webhooks belong wherever the Lob fulfillment integration lives.

If `wumbo-core` owns fulfillment state for now, Lob webhooks can also live in
`wumbo-core`.

If Lob submission later moves to a dedicated fulfillment service, the Lob
webhook entrypoint should move with it, and that service should emit internal
events back into the rest of the system.

## Operational Notes

- return `2xx` only after signature verification and safe acceptance of the webhook
- store enough provider identifiers to dedupe retries safely
- do not assume provider event ordering
- keep webhook handlers thin
- let domain use-cases decide whether a state transition is valid
- keep EventBridge publishing behind the transactional outbox
