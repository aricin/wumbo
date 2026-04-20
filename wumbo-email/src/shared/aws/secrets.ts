import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const secretsManagerClient = new SecretsManagerClient({});
const secretCache = new Map<string, Promise<string>>();

export async function getSecretString(secretArn: string): Promise<string> {
  let cachedSecret = secretCache.get(secretArn);

  if (!cachedSecret) {
    cachedSecret = fetchSecretString(secretArn);
    secretCache.set(secretArn, cachedSecret);
  }

  return cachedSecret;
}

async function fetchSecretString(secretArn: string): Promise<string> {
  const response = await secretsManagerClient.send(
    new GetSecretValueCommand({
      SecretId: secretArn,
    }),
  );

  const secretString = response.SecretString?.trim();

  if (!secretString) {
    throw new Error(`Secret ${secretArn} does not contain a SecretString value.`);
  }

  return secretString;
}
