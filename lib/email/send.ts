import "server-only";

import { BRAND_NAME } from "@/lib/brand";

// Transactional email through Resend's REST API (no SDK). Keys: RESEND_API_KEY, EMAIL_FROM.
// Without a key in development the email is printed to the terminal instead of sent.

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[email → ${email.to}] ${email.subject}\n${email.text}\n`);
      return;
    }
    throw new Error("RESEND_API_KEY is not set");
  }

  const from = process.env.EMAIL_FROM?.trim() || `${BRAND_NAME} <no-reply@tezda.app>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Resend's error body has no personal data beyond what we sent; keep it short
    const body = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Resend ${response.status}: ${body}`);
  }
}
