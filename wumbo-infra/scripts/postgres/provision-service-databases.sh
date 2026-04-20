#!/usr/bin/env bash

set -euo pipefail

PROJECT_NAME="wumbo"
WORKLOAD_NAME="marketplace"
ENVIRONMENT="dev"
REGION="us-west-2"
TUNNEL_HOST="127.0.0.1"
TUNNEL_PORT="15432"
ROTATE_PASSWORDS="false"
SERVICES=()

usage() {
  cat <<'EOF'
Usage: provision-service-databases.sh [options]

Creates or reconciles service-owned logical PostgreSQL databases and users
inside the shared marketplace RDS instance.

Options:
  --project-name VALUE     Project name. Default: wumbo
  --workload-name VALUE    Workload name. Default: marketplace
  --environment VALUE      Environment name. Default: dev
  --region VALUE           AWS region. Default: us-west-2
  --tunnel-host VALUE      Local forwarded host. Default: 127.0.0.1
  --tunnel-port VALUE      Local forwarded port. Default: 15432
  --service VALUE          Service name to provision. Repeat to add more.
  --rotate-passwords       Rotate existing service passwords.
  -h, --help               Show this help text.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-name)
      PROJECT_NAME="$2"
      shift 2
      ;;
    --workload-name)
      WORKLOAD_NAME="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --tunnel-host)
      TUNNEL_HOST="$2"
      shift 2
      ;;
    --tunnel-port)
      TUNNEL_PORT="$2"
      shift 2
      ;;
    --service)
      SERVICES+=("$2")
      shift 2
      ;;
    --rotate-passwords)
      ROTATE_PASSWORDS="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ${#SERVICES[@]} -eq 0 ]]; then
  SERVICES=("core" "identity" "email")
fi

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENSURE_SQL="$SCRIPT_ROOT/sql/ensure-service-database.sql"
CONFIGURE_SQL="$SCRIPT_ROOT/sql/configure-service-database.sql"

assert_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Required command not found: $name" >&2
    exit 1
  fi
}

assert_service_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[a-z][a-z0-9_]*$ ]]; then
    echo "Service/database names must match ^[a-z][a-z0-9_]*$: $name" >&2
    exit 1
  fi
}

aws_text() {
  local output
  if ! output="$(aws "$@" 2>&1)"; then
    echo "aws $* failed." >&2
    echo "$output" >&2
    exit 1
  fi

  output="${output//$'\r'/}"
  printf '%s' "$output"
}

aws_text_allow_failure() {
  local output
  if ! output="$(aws "$@" 2>/dev/null)"; then
    return 1
  fi

  output="${output//$'\r'/}"

  if [[ -z "$output" || "$output" == "None" || "$output" == "null" ]]; then
    return 1
  fi

  printf '%s' "$output"
}

get_ssm_value() {
  local name="$1"
  aws_text \
    ssm get-parameter \
    --name "$name" \
    --region "$REGION" \
    --query "Parameter.Value" \
    --output text
}

put_ssm_value() {
  local name="$1"
  local value="$2"
  aws_text \
    ssm put-parameter \
    --name "$name" \
    --type "String" \
    --value "$value" \
    --overwrite \
    --region "$REGION" \
    >/dev/null
}

get_secret_value() {
  local secret_id="$1"
  aws_text \
    secretsmanager get-secret-value \
    --secret-id "$secret_id" \
    --region "$REGION" \
    --query "SecretString" \
    --output text
}

new_random_password() {
  local password
  set +o pipefail
  password="$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)"
  set -o pipefail
  printf '%s' "$password"
}

get_or_create_service_secret() {
  local service_name="$1"
  local kms_key_arn="$2"
  local secret_name="$PROJECT_NAME-$service_name-$ENVIRONMENT-postgres/password"
  local secret_arn
  local password

  if secret_arn="$(aws_text_allow_failure \
    secretsmanager describe-secret \
    --secret-id "$secret_name" \
    --region "$REGION" \
    --query "ARN" \
    --output text)"; then

    if [[ "$ROTATE_PASSWORDS" == "true" ]]; then
      password="$(new_random_password)"
      aws_text \
        secretsmanager put-secret-value \
        --secret-id "$secret_name" \
        --secret-string "$password" \
        --region "$REGION" \
        >/dev/null
    else
      password="$(get_secret_value "$secret_name")"
    fi
  else
    password="$(new_random_password)"
    secret_arn="$(aws_text \
      secretsmanager create-secret \
      --name "$secret_name" \
      --description "PostgreSQL password for $service_name in $ENVIRONMENT." \
      --kms-key-id "$kms_key_arn" \
      --secret-string "$password" \
      --region "$REGION" \
      --query "ARN" \
      --output text)"
  fi

  printf '%s\t%s\t%s\n' "$secret_arn" "$secret_name" "$password"
}

to_psql_path() {
  local path="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$path"
  else
    printf '%s' "$path"
  fi
}

invoke_psql() {
  local host_name="$1"
  local port="$2"
  local username="$3"
  local database="$4"
  local sql_file="$5"
  shift 5

  PGPASSWORD="$MASTER_PASSWORD" \
  psql \
    --host="$host_name" \
    --port="$port" \
    --username="$username" \
    --dbname="$database" \
    --file="$sql_file" \
    --set=ON_ERROR_STOP=1 \
    "$@"
}

invoke_service_provisioning() {
  local service_name="$1"
  local service_password="$2"

  invoke_psql \
    "$TUNNEL_HOST" \
    "$TUNNEL_PORT" \
    "$MASTER_USERNAME" \
    "postgres" \
    "$ENSURE_SQL_PSQL" \
    --set="service_name=$service_name" \
    --set="service_password=$service_password"

  invoke_psql \
    "$TUNNEL_HOST" \
    "$TUNNEL_PORT" \
    "$MASTER_USERNAME" \
    "$service_name" \
    "$CONFIGURE_SQL_PSQL" \
    --set="service_name=$service_name"
}

if [[ ! -f "$ENSURE_SQL" ]]; then
  echo "Missing SQL template: $ENSURE_SQL" >&2
  exit 1
fi

if [[ ! -f "$CONFIGURE_SQL" ]]; then
  echo "Missing SQL template: $CONFIGURE_SQL" >&2
  exit 1
fi

assert_command aws
assert_command psql

export MSYS_NO_PATHCONV=1

ENSURE_SQL_PSQL="$(to_psql_path "$ENSURE_SQL")"
CONFIGURE_SQL_PSQL="$(to_psql_path "$CONFIGURE_SQL")"

SHARED_PREFIX="/$PROJECT_NAME/$WORKLOAD_NAME/$ENVIRONMENT/databases/$WORKLOAD_NAME"
REMOTE_HOST="$(get_ssm_value "$SHARED_PREFIX/host")"
REMOTE_PORT="$(get_ssm_value "$SHARED_PREFIX/port")"
MASTER_USERNAME="$(get_ssm_value "$SHARED_PREFIX/master-username")"
MASTER_SECRET_ARN="$(get_ssm_value "$SHARED_PREFIX/master-secret-arn")"
KMS_KEY_ARN="$(get_ssm_value "$SHARED_PREFIX/kms-key-arn")"
MASTER_PASSWORD="$(get_secret_value "$MASTER_SECRET_ARN")"

SERVICE_SUMMARY=()

for service in "${SERVICES[@]}"; do
  assert_service_name "$service"

  IFS=$'\t' read -r secret_arn secret_name service_password < <(
    get_or_create_service_secret "$service" "$KMS_KEY_ARN"
  )

  invoke_service_provisioning "$service" "$service_password"

  service_prefix="/$PROJECT_NAME/$service/$ENVIRONMENT/databases/$service"

  put_ssm_value "$service_prefix/host" "$REMOTE_HOST"
  put_ssm_value "$service_prefix/port" "$REMOTE_PORT"
  put_ssm_value "$service_prefix/name" "$service"
  put_ssm_value "$service_prefix/username" "$service"
  put_ssm_value "$service_prefix/secret-arn" "$secret_arn"
  put_ssm_value "$service_prefix/kms-key-arn" "$KMS_KEY_ARN"

  SERVICE_SUMMARY+=("$service"$'\t'"$service"$'\t'"$service"$'\t'"$secret_arn")
done

printf '\nProvisioned logical databases on %s/%s:\n' "$WORKLOAD_NAME" "$ENVIRONMENT"
printf 'SERVICE\tDATABASE\tUSERNAME\tSECRET ARN\n'
for row in "${SERVICE_SUMMARY[@]}"; do
  printf '%s\n' "$row"
done
