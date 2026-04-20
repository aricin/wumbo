export interface EmailTag {
  name: string;
  value: string;
}

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  idempotencyKey?: string;
  tags?: EmailTag[];
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  id: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
