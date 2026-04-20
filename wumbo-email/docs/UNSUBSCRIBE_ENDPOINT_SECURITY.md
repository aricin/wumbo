# Unsubscribe Endpoint Security

`wumbo-email` exposes a public unsubscribe endpoint at:

- `GET /unsubscribe/{token}`
- `POST /unsubscribe/{token}`

The endpoint is intentionally public because RFC 8058 one-click unsubscribe does
not rely on sessions, cookies, or caller authentication. The authorization model
is the opaque unsubscribe token embedded in the email.

## Security Model

The unsubscribe endpoint is protected through a layered design:

- **Opaque token authorization**. The token in the URL is the capability that
  authorizes the unsubscribe.
- **Safe `GET` behavior**. `GET` only renders a confirmation page. It never
  changes subscription state.
- **Validated one-click `POST` behavior**. `POST` must carry the RFC 8058
  one-click form field (`List-Unsubscribe=One-Click`) using
  `application/x-www-form-urlencoded` or `multipart/form-data`.
- **Idempotent unsubscribe**. Repeated valid requests keep the recipient in the
  same unsubscribed state instead of causing unsafe side effects.
- **Rate monitoring at the edge**. The public REST API has an AWS WAF rate-based
  rule for `POST` requests to unsubscribe paths. It is currently in **Count**
  mode so we can observe production traffic before deciding whether to block.

## Exact Scenarios We Want To Protect Against

### 1. Token guessing / brute force

An attacker sends many requests trying to guess valid unsubscribe tokens.

Primary defenses:

- long random opaque tokens
- database lookup by token
- WAF rate monitoring keyed by client IP

### 2. Mass flood / availability attack

An attacker sends a high volume of unsubscribe traffic to make legitimate
requests fail or to create noisy logs.

Primary defenses:

- API Gateway + Lambda scaling
- AWS WAF rate monitoring on `POST /unsubscribe/*`
- future option to switch the WAF rule from Count to Block after tuning

### 3. Crafted spam trying to unsubscribe victims

RFC 8058 calls out the risk of malicious senders embedding unsubscribe URLs for
someone else’s mailing list into spam, hoping mailbox-provider automation or
user actions trigger unwanted opt-outs.

Primary defense:

- hard-to-forge opaque tokens instead of plaintext identifiers

### 4. Accidental unsubscribe from automatic link fetching

Mail clients and scanners sometimes fetch links automatically.

Primary defenses:

- `GET` is safe and has no side effects
- only `POST` performs the unsubscribe
- the `POST` must look like a compliant one-click unsubscribe request

### 5. Replay of a valid unsubscribe request

A valid unsubscribe request is repeated later.

Primary defense:

- idempotent state changes

This is acceptable behavior for unsubscribe. Replays should not create new
problems; they should only confirm the same result.

### 6. Token leakage from logs, browsers, or internal systems

If a raw unsubscribe URL leaks, whoever has it can use it.

Primary defenses:

- avoid logging raw tokens or full unsubscribe URLs
- serve HTML with `Referrer-Policy: no-referrer`
- future option to hash tokens at rest in the database

### 7. Session / cookie confusion

One-click unsubscribe must not depend on existing website sessions or browser
state.

Primary defense:

- the endpoint ignores login/session context and validates only the token plus
  the RFC-compliant request body

## Why WAF Is Supplemental Here

WAF is **not** the primary authorization mechanism for unsubscribe. The token is.

The WAF rule exists to help us observe and eventually control abusive request
rates, especially from a single source IP. It is a defense-in-depth availability
measure, not the thing that makes a request valid.

Current WAF posture:

- AWS WAF attached to the public REST API stage
- rate-based rule scoped to `POST` requests whose URI path contains
  `/unsubscribe/`
- action set to **Count**

This lets us inspect real traffic safely before we consider enabling blocking.

## Current Implementation Notes

- Handler: `src/handlers/api/unsubscribe.ts`
- Public API: `template.yaml`
- WAF rule: `template.yaml`

## References

- https://www.rfc-editor.org/rfc/rfc8058
- https://support.google.com/mail/answer/15263077?hl=en
- https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-testing.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/aws-waf-rate-based-rules.html
