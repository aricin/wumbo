export type EmailClassification = "transactional" | "promotional";
export type SenderProfile = "default" | "product" | "fulfillment" | "security";

export interface EmailTypeDefinition {
  type: string;
  classification: EmailClassification;
  fromProfile: SenderProfile;
}
