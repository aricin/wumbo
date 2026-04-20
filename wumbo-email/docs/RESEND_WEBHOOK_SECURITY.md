# Resend Webhook Security

`wumbo-email` treats the Resend webhook as a public endpoint with authenticated payloads.
The endpoint must be reachable from the public internet, but every request still has to
prove that it came from Resend and that we have not already finished processing it.

## What We Enforce

- **HTTPS-only endpoint**. Resend delivers webhook events over HTTPS.
- **Raw-body verification**. We verify the exact request body string before parsing it.
- **Required Svix headers**. We require `svix-id`, `svix-timestamp`, and `svix-signature`.
- **Signing-secret verification**. We verify the signature with the endpoint-specific
  webhook secret from environment variables or Secrets Manager.
- **Replay-age protection**. The `svix` verifier we use rejects timestamps outside its
  five-minute tolerance window.
- **At-least-once dedupe**. We persist `svix-id` as `external_event_id` so duplicate
  deliveries can be identified safely.
- **Retry-safe resume behavior**. If a prior attempt inserted the webhook receipt but
  crashed before completion, a retry with the same `svix-id` is resumed instead of
  being treated as a completed duplicate.

## Why The Flow Looks Like This

Resend recommends verifying webhook signatures with the signing secret and the **raw
request body**, because any change to the body breaks signature verification.

Resend also documents that webhook delivery is **at least once**, so duplicate deliveries
must be expected and deduped with `svix-id`. Retries and manual replays are normal parts
of the provider contract, so `wumbo-email` persists the webhook receipt before applying
delivery-state changes.

## Current Implementation

- Signature verification lives in `src/providers/resend-webhooks.ts`.
- The public handler lives in `src/handlers/webhooks/resend.ts`.
- Receipt dedupe and processed-state tracking live in
  `src/db/schema/provider-webhook-events.ts` and
  `src/db/repositories/email-state-repository.ts`.

## Optional Hardening

Resend publishes webhook source IPs if you need an allowlist. We intentionally do **not**
make IP allowlisting the primary control, because the signature is the main source-of-truth
authentication mechanism and is resilient to infrastructure changes.

If we later put WAF in front of this endpoint, it should be a light flood-control layer.
It should not replace signature verification.

## References

- https://resend.com/docs/webhooks/verify-webhooks-requests
- https://resend.com/docs/webhooks/introduction
- https://resend.com/docs/webhooks/retries-and-replays
