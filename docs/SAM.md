# SAM

## CloudFormation early validation

- If a `sam deploy` fails while creating the change set with an `AWS::EarlyValidation::*` error, use `aws cloudformation describe-events`.
- Do not start with `aws cloudformation describe-stack-events` for this class of failure. It usually only shows the top-level stack status, not the specific validation error.
- When querying a failed change set, include both `--stack-name` and `--change-set-name`.

Example:

```bash
aws cloudformation describe-events \
  --stack-name wumbo-identity-dev \
  --change-set-name samcli-deploy1234567890 \
  --region us-west-2 \
  --output table \
  --no-cli-pager
```

- Look for `VALIDATION_ERROR` events to find the exact logical resource and validation reason.
