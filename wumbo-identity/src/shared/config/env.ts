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

export function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = readOptionalEnv(name);

  if (value === undefined) {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Expected ${name} to be "true" or "false".`);
}

export function readIntegerEnv(name: string, defaultValue: number): number {
  const value = readOptionalEnv(name);

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected ${name} to be an integer.`);
  }

  return parsed;
}
