export function readEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];

  if (value !== undefined && value.trim() !== "") {
    return value.trim();
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value.trim();
}

export function readIntegerEnv(name: string, defaultValue?: number): number {
  const value = readOptionalEnv(name);

  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Missing required integer environment variable: ${name}`);
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer.`);
  }

  return parsed;
}

export function readBooleanEnv(name: string, defaultValue?: boolean): boolean {
  const value = readOptionalEnv(name);

  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Missing required boolean environment variable: ${name}`);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Environment variable ${name} must be 'true' or 'false'.`);
}
