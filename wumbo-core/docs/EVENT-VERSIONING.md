# Event Versioning

This document defines how `wumbo-core` should evolve events without breaking
downstream consumers.

## Principles

- Treat a published event version as immutable once another service depends on it.
- Put the version in `detail-type`, such as `user-registered.v1`.
- Prefer additive changes over breaking changes.
- When in doubt, publish a new event version instead of changing an old one in place.

Current event shape conventions:

- `source`: producer identity, such as `wumbo.core`
- `detail-type`: versioned contract name, such as `user-registered.v1`
- `detail`: event envelope with `eventId`, `aggregateType`, `aggregateId`,
  `occurredAt`, and `data`

## Non-Breaking Changes

These are generally safe within the same event version:

- adding a new optional field
- adding new enum values if consumers already handle unknown values safely
- adding metadata that consumers can ignore

Consumers should be written to ignore fields they do not use.

## Breaking Changes

These require a new event version, such as `v2`:

- removing a field
- renaming a field
- changing a field type
- changing the meaning of an existing field
- making an optional field required
- changing nested structure in a way old consumers cannot parse

Do not ship a breaking payload change under the same `detail-type`.

## Breaking Change Rollout

When an event needs a breaking change:

1. Create a new versioned event contract.
2. Keep the old version unchanged.
3. Deploy consumers that can handle the new version.
4. Keep the old consumer path active while `v1` events are still possible.
5. Switch the producer to publish the new version.
6. Wait for old-version traffic to drain from queues, DLQs, and any replay path.
7. Retire the old consumer only after `v1` is no longer in flight.

In practice, this means there is usually a period where both versions are live:

- producer may still emit `v1`
- some consumers may already support `v2`
- `v1` consumers must stay deployed until old traffic is drained

For EventBridge-based consumers, use precise rules that match both:

- `source`
- `detail-type`

That keeps `v1` and `v2` traffic separate and makes migration safer.

## Consumer Migration Guidance

When possible, treat each event version as its own contract:

- `mailer-order-paid.v1`
- `mailer-order-paid.v2`

Consumers can support migration in either of these ways:

- separate handlers or rules for each version
- one handler that explicitly supports both versions during rollout

The important part is that support for `v1` remains in place until `v1` traffic is
fully drained.

## What Happens If a Breaking Change Slips Through?

If a producer makes a breaking change under the same event name and a consumer
cannot parse or process it, the consumer should fail loudly rather than silently
accepting bad data.

With the recommended `EventBridge -> SQS -> Lambda` pattern:

- the failed record is retried
- successful records can continue when partial batch failure handling is used
- after the queue's `maxReceiveCount`, the bad record moves to the DLQ

This means the event does not disappear, but it can back up retries until the
consumer is fixed or the message is moved to the DLQ.

Operationally:

1. alert on consumer failures and DLQ depth
2. fix the consumer or restore contract compatibility
3. redrive DLQ messages only after the consumer can handle them safely

## Rule Of Thumb

- additive change: keep the same event version
- incompatible change: publish a new event version
- retire the old version only after all in-flight old events are drained
