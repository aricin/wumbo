\set ON_ERROR_STOP on

SET wumbo.service_name = :'service_name';

REVOKE ALL ON SCHEMA public FROM PUBLIC;

DO $do$
DECLARE
  service_name text := current_setting('wumbo.service_name');
BEGIN
  EXECUTE format(
    'ALTER SCHEMA public OWNER TO %I',
    service_name
  );

  EXECUTE format(
    'GRANT ALL ON SCHEMA public TO %I',
    service_name
  );

  EXECUTE format(
    'ALTER ROLE %I IN DATABASE %I SET search_path TO public',
    service_name,
    service_name
  );
END
$do$;
