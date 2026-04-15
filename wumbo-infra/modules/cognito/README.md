# cognito

Minimal Cognito foundation for the `identity` service.

## What It Does

This module creates:

- one Cognito user pool
- one customer-facing app client
- one admin app client
- one optional hosted-login domain for the UI app client
- one optional PostConfirmation trigger attachment
- default `admin` and `customer` groups
- SSM parameters for the user pool ID, issuer URL, client IDs, and JWT audiences

## Why This Shape

- keeps identity-specific auth resources under a dedicated service boundary
- gives `wumbo-ui`, `wumbo-admin`, and `wumbo-core` stable config values without Terraform remote-state coupling
- lets you turn on browser login for `wumbo-ui` without forcing the same shape onto `wumbo-admin` yet

## Key Inputs

- `service_name`
- `aws_region`
- `parameter_prefix`
- `allow_self_signup`
- `deletion_protection`
- optional `ui_domain_prefix`
- optional `ui_callback_urls`
- optional `ui_logout_urls`
- optional `post_confirmation_lambda_arn`

## Outputs

- `user_pool_id`
- `issuer_url`
- `ui_client_id`
- `ui_domain_url`
- `ui_callback_urls`
- `ui_logout_urls`
- `admin_client_id`
- `jwt_audiences`
- `post_confirmation_lambda_arn`

## Notes

- The user pool uses email as the username.
- The first pass enables direct auth flows suitable for development and early app wiring.
- Hosted login for `wumbo-ui` is only enabled when you provide a domain prefix plus callback/logout URLs.
- The `admin` client is still left as a simpler direct-auth client for now so the UI pattern can be proven first.
- If you provide `post_confirmation_lambda_arn`, the module grants Cognito permission to invoke that Lambda and attaches it to the user pool.
- By default, resource names and SSM paths are service-scoped, such as `wumbo-identity-dev` and `/wumbo/identity/dev/cognito/*`.
