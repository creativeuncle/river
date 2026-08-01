import nodemailer from "nodemailer";

// Only configured if all three SMTP env vars are present. Until then,
// sendNotificationEmail() is a silent no-op — the app works fine without
// email set up, and Settings tells the owner it isn't configured yet.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;

export const isEmailConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export async function sendNotificationEmail(to: string, subject: string, text: string): Promise<void> {
  if (!transporter) return;
  try {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, text });
  } catch (err) {
    console.error("Failed to send notification email:", err instanceof Error ? err.message : err);
  }
}
