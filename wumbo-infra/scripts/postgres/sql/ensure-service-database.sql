\set ON_ERROR_STOP on

SET wumbo.service_name = :'service_name';
SET wumbo.service_password = :'service_password';

DO $do$
DECLARE
  service_name text := current_setting('wumbo.service_name');
  service_password text := current_setting('wumbo.service_password');
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = service_name
  ) THEN
    EXECUTE format(
      'CREATE ROLE %I LOGIN PASSWORD %L',
      service_name,
      service_password
    );
  ELSE
    EXECUTE format(
      'ALTER ROLE %I WITH LOGIN PASSWORD %L',
      service_name,
      service_password
    );
  END IF;
END
$do$;

DO $do$
DECLARE
  service_name text := current_setting('wumbo.service_name');
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_database
    WHERE datname = service_name
  ) THEN
    EXECUTE format(
      'CREATE DATABASE %I OWNER %I',
      service_name,
      service_name
    );
  END IF;

  EXECUTE format(
    'ALTER DATABASE %I OWNER TO %I',
    service_name,
    service_name
  );

  EXECUTE format(
    'REVOKE ALL ON DATABASE %I FROM PUBLIC',
    service_name
  );

  EXECUTE format(
    'GRANT CONNECT, TEMP ON DATABASE %I TO %I',
    service_name,
    service_name
  );

  EXECUTE format(
    'REVOKE CONNECT ON DATABASE postgres FROM %I',
    service_name
  );
END
$do$;
