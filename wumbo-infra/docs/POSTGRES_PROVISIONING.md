# Shared Postgres Provisioning

`wumbo-infra` owns the shared marketplace PostgreSQL instance.

It does **not** ask Terraform to create logical Postgres databases and users
inside that instance. Instead, a small manual provisioner creates those
service-owned objects after the AWS infrastructure is applied.

## Why This Exists

This keeps the responsibilities split cleanly:

- Terraform owns the AWS infrastructure:
  - the RDS instance
  - networking and security
  - the master secret
  - the KMS key
  - the jump host
- the Postgres provisioner owns the Postgres objects inside that instance:
  - logical databases such as `core` and `identity`
  - service users
  - ownership and access rules
  - per-service secrets and SSM metadata
- service repos own their own migrations inside their logical database

That lets us keep one shared PostgreSQL instance for cost and operational
simplicity while still giving each relational service its own database and
credential.

## Current Shared Instance Model

- shared instance identifier: `wumbo-marketplace-<env>-postgres`
- master username: `postgres`
- shared datastore metadata path:
  - `/wumbo/marketplace/<env>/databases/marketplace/*`

The shared metadata path describes the **marketplace shared datastore
namespace**, not a logical application database named `marketplace`.

## Service-Owned Databases In This Pass

The provisioner currently creates:

- `core` database + `core` user
- `identity` database + `identity` user

And it publishes service-owned metadata under:

- `/wumbo/core/<env>/databases/core/*`
- `/wumbo/identity/<env>/databases/identity/*`

Each service gets:

- host
- port
- database name
- username
- secret ARN
- KMS key ARN

## Run Order

Use this sequence for a fresh or changed environment:

1. apply `wumbo-infra`
2. start the jump-host port-forward locally
3. run the Postgres provisioner
4. run service migrations and deploys

The provisioner assumes the local tunnel is already open to the shared RDS
instance.

## Manual Command

From `wumbo-infra`:

```bash
bash ./scripts/postgres/provision-service-databases.sh --environment dev --region us-west-2
```

Default behavior:

- workload = `marketplace`
- services = `core`, `identity`
- local tunnel host = `127.0.0.1`
- local tunnel port = `15432`

If you want to rotate service passwords while reconciling, add:

```bash
--rotate-passwords
```

## Idempotency

The provisioner is designed to be safe to rerun:

- existing databases are left in place
- existing users are updated to the current password from Secrets Manager
- existing service secrets are reused unless `-RotatePasswords` is provided
- SSM metadata is overwritten with the current desired values

This is a manual platform operation, not part of normal app CI/CD.

## When To Split Into Separate DB Instances

This one-instance, many-databases model is the current default because it keeps
shared compute acceptable while load is still inconsistent.

Move a service to its own DB instance when it needs:

- independent scaling
- a different availability or restore posture
- materially different tuning
- stronger blast-radius isolation
- relief from repeated noisy-neighbor issues

Some services may skip Postgres entirely and use DynamoDB instead if that fits
their data model and access patterns better.
