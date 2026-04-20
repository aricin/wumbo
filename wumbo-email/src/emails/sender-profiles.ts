import type { RuntimeConfig } from "../shared/config/runtime";
import type { SenderProfile } from "./types";

export interface SenderProfileConfig {
  fromEmail: string;
  replyToEmail?: string;
}

export function resolveSenderProfile(
  profile: SenderProfile,
  config: RuntimeConfig,
): SenderProfileConfig {
  switch (profile) {
    case "default":
      return {
        fromEmail: config.defaultFromEmail,
      };
    case "product":
    case "fulfillment":
    case "security":
      return {
        fromEmail: config.defaultFromEmail,
        replyToEmail: config.defaultReplyToEmail,
      };
    default:
      return assertNever(profile);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled sender profile: ${String(value)}`);
}
