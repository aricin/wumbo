# SSM Configuration

## Strategy

- Producer services publish stable, non-secret config to SSM Parameter Store.
- Consumer services reference the SSM parameter path, not the copied value.
- When the producer changes a value, consumers pick it up on their next deploy.

This is the preferred pattern for cross-service configuration in `wumbo`.

## Use This For

- Cognito issuer URLs
- Cognito client IDs
- Cognito callback and logout URLs
- shared app metadata that is safe to store as plain configuration

Do not use this for passwords, tokens, or other secrets. Keep those in Secrets Manager.

## SAM Pattern

For SAM stacks, prefer CloudFormation SSM parameter types:

```yaml
Parameters:
  CognitoIssuer:
    Type: AWS::SSM::Parameter::Value<String>

  CognitoAudiences:
    Type: AWS::SSM::Parameter::Value<List<String>>
```

Then pass the parameter path in `samconfig.toml`, not the resolved value:

```toml
CognitoIssuer="/wumbo/identity/dev/cognito/issuer-url"
CognitoAudiences="/wumbo/identity/dev/cognito/jwt-audiences"
```

## Wumbo Example

`wumbo-identity` owns and publishes:

- `/wumbo/identity/<env>/cognito/issuer-url`
- `/wumbo/identity/<env>/cognito/ui-client-id`
- `/wumbo/identity/<env>/cognito/admin-client-id`
- `/wumbo/identity/<env>/cognito/jwt-audiences`
- `/wumbo/identity/<env>/cognito/ui-domain-url`

`wumbo-core` should consume those paths in SAM.

`wumbo-ui` already follows this pattern in GitHub Actions by reading identity config from SSM before building the image.

## Operational Note

- SSM-backed config is resolved at deploy time.
- Changing the SSM value does not hot-update already deployed stacks.
- If identity changes a shared config value, redeploy the dependent service.
