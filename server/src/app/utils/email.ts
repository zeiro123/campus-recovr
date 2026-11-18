// Email delivery: uses Resend when RESEND_API_KEY is configured; otherwise
// the link is logged and (outside production) returned to the caller so the
// flow stays usable in local/QA environments without an email service.
const RESEND_URL = "https://api.resend.com/emails";

export type SendEmailResult = {
  delivered: boolean;      // a real email went out
  previewLink?: string;    // dev/QA convenience — never set in production
  error?: string;
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> => {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — "${subject}" for ${to} not sent.`);
    return { delivered: false };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Campus RecovR <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[email] Resend error ${res.status}: ${text.slice(0, 200)}`);
      return { delivered: false, error: `Resend ${res.status}` };
    }
    return { delivered: true };
  } catch (err: any) {
    console.error(`[email] send failed: ${err?.message || err}`);
    return { delivered: false, error: err?.message };
  }
};

// Build the branded email wrapper.
export const emailHtml = (title: string, body: string, linkLabel: string, link: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0b1424;color:#f4f6fb;border-radius:12px;">
    <h2 style="color:#F87D0D;margin:0 0 12px;">Campus RecovR</h2>
    <h3 style="margin:0 0 8px;">${title}</h3>
    <p style="line-height:1.6;color:#b6c2d9;">${body}</p>
    <p style="margin:20px 0;">
      <a href="${link}" style="background:#F87D0D;color:#2b1602;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">${linkLabel}</a>
    </p>
    <p style="font-size:12px;color:#8d9cb8;">If the button doesn't work, paste this link into your browser:<br/>${link}</p>
  </div>
`;
