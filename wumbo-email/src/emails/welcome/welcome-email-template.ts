export interface WelcomeEmailContent {
  subject: string;
  html: string;
  text: string;
}

interface RenderWelcomeEmailTemplateInput {
  unsubscribeUrl: string;
}

export function renderWelcomeEmailTemplate({
  unsubscribeUrl,
}: RenderWelcomeEmailTemplateInput): WelcomeEmailContent {
  return {
    subject: "Welcome to Wumbo",
    html: [
      "<p>Welcome to Wumbo.</p>",
      "<p>Your account is ready and we're glad you're here.</p>",
      "<p>We'll keep the first version simple and build out richer onboarding from here.</p>",
      `<p style="margin-top: 32px; font-size: 14px; color: #555;">If you do not want promotional email from Wumbo, you can <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe here</a>.</p>`,
    ].join(""),
    text: [
      "Welcome to Wumbo.",
      "",
      "Your account is ready and we're glad you're here.",
      "",
      "We'll keep the first version simple and build out richer onboarding from here.",
      "",
      `If you do not want promotional email from Wumbo, unsubscribe here: ${unsubscribeUrl}`,
    ].join("\n"),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
