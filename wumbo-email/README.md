# wumbo-email

`wumbo-email` is Wumbo's centralized email delivery and compliance service.

Domain services decide that an email should happen. `wumbo-email` owns how that
email is delivered.

## What This Service Owns

- consuming domain events that should trigger email delivery
- classifying email as `transactional` or `promotional`
- sender-profile resolution and provider delivery through Resend
- service-owned queue, DLQ, alarms, and public REST API endpoints
- durable delivery state in the shared marketplace Postgres instance
- global promotional unsubscribe state
- Resend webhook ingestion for delivery, bounce, complaint, and suppression events

## What This Service Does Not Own

- deciding product or fulfillment business rules on its own
- replacing domain services as the source of email intent
- inbound mailbox workflows or general-purpose reply handling
- SMS or a broader notifications abstraction

## Current Model

The immediate distinction is:

- `transactional`: always send
- `promotional`: include unsubscribe support and block delivery for opted-out recipients

`wumbo-email` currently applies promotional unsubscribe globally per recipient
email address. Transactional email still bypasses that preference state.

## Current Email Types

- `welcome`
  - classification: `promotional`
  - sender profile: `default`
  - trigger: `identity.user.registered.v1`

## Current Flow

For the existing welcome email path:

1. `wumbo-identity` publishes `identity.user.registered.v1`
2. EventBridge routes the event to the `wumbo-email` SQS queue
3. the queue consumer creates or reuses a delivery row
4. if the email is promotional, `wumbo-email` checks unsubscribe state
5. if not unsubscribed, it sends through Resend and persists the provider message id
6. Resend webhooks reconcile later provider state back into the delivery record

## What The Database Stores

`wumbo-email` uses the shared marketplace Postgres instance with its own logical
`email` database.

Current tables:

- `email_deliveries`
  - one row per logical email delivery attempt
  - owns local idempotency, sender info, recipient info, provider message id, and latest status
- `email_delivery_events`
  - normalized delivery history such as `sent`, `delivered`, `bounced`, or `complained`
- `promotional_unsubscribes`
  - global promotional opt-out state by recipient email
- `provider_webhook_events`
  - raw deduped provider webhook receipts keyed by the external webhook event id

## Current Structure

```text
src/
  db/
  emails/
    welcome/
      __tests__/
  handlers/
    api/
      __tests__/
    consumers/
      __tests__/
    webhooks/
      __tests__/
  providers/
  shared/
```

High-level responsibilities:

- `src/db`: connection bootstrap, schema, migrations, and persistence helpers
- `src/emails`: email definitions, sender rules, and email-type workflows
- `src/handlers/api`: public REST API endpoints such as unsubscribe
- `src/handlers/consumers`: async event consumer Lambdas
- `src/handlers/webhooks`: provider webhook Lambdas
- `src/providers`: provider integrations such as Resend
- `src/shared`: runtime config, secret helpers, EventBridge parsing, and HTTP helpers
- `docs`: focused operational and security notes for public surfaces

Key docs:

- [Unsubscribe endpoint security](/C:/Users/adrot/Projects/wumbo/wumbo-email/docs/UNSUBSCRIBE_ENDPOINT_SECURITY.md:1)
- [Resend webhook security](/C:/Users/adrot/Projects/wumbo/wumbo-email/docs/RESEND_WEBHOOK_SECURITY.md:1)

## Configuration

`wumbo-email` now depends on both database and email-provider configuration.

### Database

After running the shared Postgres provisioner, use the values published under:

- `/wumbo/email/<env>/databases/email/host`
- `/wumbo/email/<env>/databases/email/port`
- `/wumbo/email/<env>/databases/email/name`
- `/wumbo/email/<env>/databases/email/username`
- `/wumbo/email/<env>/databases/email/secret-arn`
- `/wumbo/email/<env>/databases/email/kms-key-arn`

Those map to the `Database*` deploy parameters in [samconfig.toml](/C:/Users/adrot/Projects/wumbo/wumbo-email/samconfig.toml:1).

### Resend

Required:

- a verified sender address or sending domain that matches `DefaultFromEmail`
- a Secrets Manager secret containing the Resend API key
- `ResendApiKeySecretArn`

Needed once webhook ingestion is wired in the Resend dashboard:

- a Secrets Manager secret containing the Resend webhook signing secret
- `ResendWebhookSecretArn`

Optional:

- `PublicBaseUrl`
- `DefaultReplyToEmail`

### Runtime Environment Variables

Local development can use direct environment variables:

- `DATABASE_URL` or `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `PUBLIC_BASE_URL`

Deployed environments should prefer Secrets Manager:

- `DB_SECRET_ARN`
- `RESEND_API_KEY_SECRET_ARN`
- `RESEND_WEBHOOK_SECRET_ARN`

Promotional email also needs `PUBLIC_BASE_URL` so the service can build
unsubscribe links. That value should be the deployed `PublicApiUrl` output or a
final custom domain that fronts the public API.

## Provisioning And Deploy Sequence

This pass adds both database persistence and webhook ingestion, so the safest
deploy sequence is:

1. run the shared Postgres provisioner so the `email` logical database exists

```bash
cd C:\Users\adrot\Projects\wumbo\wumbo-infra
bash ./scripts/postgres/provision-service-databases.sh --environment dev --region us-west-2
```

2. update the `Database*` values in [samconfig.toml](/C:/Users/adrot/Projects/wumbo/wumbo-email/samconfig.toml:1)
3. run the email DB migrations

```bash
cd C:\Users\adrot\Projects\wumbo\wumbo-email
npm run db:migrate
```

4. deploy the service once to create the queue consumer, public REST API, and WAF count-mode rule for unsubscribe monitoring

```bash
sam deploy --config-env dev
```

5. copy the `PublicApiUrl` and `ResendWebhookUrl` stack outputs
6. set `PublicBaseUrl` in [samconfig.toml](/C:/Users/adrot/Projects/wumbo/wumbo-email/samconfig.toml:1) to that deployed `PublicApiUrl` unless you already have a final custom domain
7. register the `ResendWebhookUrl` in Resend
8. store the Resend webhook signing secret in Secrets Manager
9. set `ResendWebhookSecretArn` in [samconfig.toml](/C:/Users/adrot/Projects/wumbo/wumbo-email/samconfig.toml:1)
10. deploy again so promotional email can build unsubscribe links and the webhook handler can verify signatures

## Testing

### Typecheck

```bash
npm run typecheck
```

### Tests

```bash
npm test
```

### Generate Or Apply Migrations

```bash
npm run db:generate
npm run db:migrate
```

### Validate Or Build The SAM App

If SAM cannot find `esbuild` on the host PATH, prepend the local binary:

```powershell
$env:PATH="C:\Users\adrot\Projects\wumbo\wumbo-email\node_modules\.bin;$env:PATH"
sam validate --template template.yaml --region us-west-2
sam build --template template.yaml --region us-west-2
```

## Manual Email Test

The fastest deployed send test is still to put the matching event onto the
shared EventBridge bus:

```bash
aws events put-events \
  --region us-west-2 \
  --entries '[
    {
      "EventBusName": "wumbo-marketplace-dev-domain-events",
      "Source": "wumbo.identity",
      "DetailType": "identity.user.registered.v1",
      "Detail": "{\"eventId\":\"test-email-event-1\",\"aggregateType\":\"identity-user\",\"aggregateId\":\"identity-user-test-1\",\"occurredAt\":\"2026-04-18T00:00:00.000Z\",\"data\":{\"identityUserId\":\"identity-user-test-1\",\"cognitoSubject\":\"cognito-sub-test-1\",\"email\":\"replace-me@example.com\",\"emailVerified\":true}}"
    }
  ]'
```

Replace `replace-me@example.com` with an address you want to receive the test
email at.

### Webhook Test

Resend provides test recipient addresses like `delivered@resend.dev`,
`bounced@resend.dev`, `complained@resend.dev`, and `suppressed@resend.dev`.
Those are useful once the webhook URL and signing secret are configured.

## Current Operational Baseline

- EventBridge rule for `identity.user.registered.v1`
- service-owned SQS queue + DLQ
- Lambda partial batch failure reporting
- Lambda error, duration, and DLQ alarms for the queue consumer
- Lambda error and duration alarms for the Resend webhook handler
- one-click unsubscribe headers for promotional email
- public REST API with a count-mode WAF rate rule scoped to unsubscribe `POST`s
- a standard-topic CloudWatch alarm on the unsubscribe WAF rule's `CountedRequests` metric

## Next Good Expansions

- add more explicit email-intent events from source services
- add more sender profiles with separate addresses or subdomains
- split promotional scopes if global promotional opt-out becomes too coarse
- decide whether bounce or suppression state should also be modeled locally beyond provider webhooks
