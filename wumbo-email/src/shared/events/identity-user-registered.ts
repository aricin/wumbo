export interface IdentityUserRegisteredEvent {
  eventId: string;
  identityUserId: string;
  cognitoSubject: string;
  email?: string;
  emailVerified: boolean;
}

interface IdentityUserRegisteredEnvelope {
  "detail-type"?: unknown;
  detail?: {
    eventId?: unknown;
    data?: {
      identityUserId?: unknown;
      cognitoSubject?: unknown;
      email?: unknown;
      emailVerified?: unknown;
    };
  };
}

export function parseIdentityUserRegisteredEvent(
  body: string,
  messageId: string,
): IdentityUserRegisteredEvent {
  const parsed = JSON.parse(body) as IdentityUserRegisteredEnvelope;

  if (parsed["detail-type"] !== "identity.user.registered.v1") {
    throw new Error("Unexpected EventBridge detail-type for identity registration.");
  }

  const detail = parsed.detail;
  const data = detail?.data;

  if (!detail || typeof detail !== "object") {
    throw new Error(`SQS message ${messageId} is missing event detail.`);
  }

  if (typeof detail.eventId !== "string" || detail.eventId.trim() === "") {
    throw new Error(`SQS message ${messageId} is missing detail.eventId.`);
  }

  if (!data || typeof data !== "object") {
    throw new Error(`SQS message ${messageId} is missing identity registration data.`);
  }

  if (typeof data.identityUserId !== "string" || data.identityUserId.trim() === "") {
    throw new Error(`SQS message ${messageId} is missing data.identityUserId.`);
  }

  if (typeof data.cognitoSubject !== "string" || data.cognitoSubject.trim() === "") {
    throw new Error(`SQS message ${messageId} is missing data.cognitoSubject.`);
  }

  if (typeof data.emailVerified !== "boolean") {
    throw new Error(`SQS message ${messageId} is missing data.emailVerified.`);
  }

  return {
    eventId: detail.eventId,
    identityUserId: data.identityUserId,
    cognitoSubject: data.cognitoSubject,
    email: typeof data.email === "string" && data.email.trim() !== "" ? data.email : undefined,
    emailVerified: data.emailVerified,
  };
}
