// Email with a one-time code — pure (texts come in already translated), unit-tested.

export interface CodeEmailTexts {
  subject: string;
  heading: string;
  intro: string;
  expires: string;
  ignore: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function codeEmail(code: string, t: CodeEmailTexts, brand: string) {
  const text = [t.heading, "", t.intro, "", code, "", t.expires, t.ignore, "", brand].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f6f4;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:15px;font-weight:600">${escapeHtml(brand)}</p>
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapeHtml(t.heading)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#444">${escapeHtml(t.intro)}</p>
<p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,Consolas,monospace">${escapeHtml(code)}</p>
<p style="margin:0 0 4px;font-size:13px;color:#666">${escapeHtml(t.expires)}</p>
<p style="margin:0;font-size:13px;color:#666">${escapeHtml(t.ignore)}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { subject: t.subject, html, text };
}

/** "123 456", "123456", " 123-456 " → "123456"; anything else → null */
export function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}
