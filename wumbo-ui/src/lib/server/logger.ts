type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogFields {
  [key: string]: unknown;
}

export function logServerEvent(level: LogLevel, message: string, fields: LogFields = {}): void {
  const entry = {
    level,
    message,
    service: "wumbo-ui",
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const line = JSON.stringify(entry);

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  console.log(line);
}
