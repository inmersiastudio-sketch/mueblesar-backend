import { env } from "../config/env.js";

// Simple email service — logs to console in dev, can be replaced with nodemailer/sendgrid/resend in production
export async function sendEmail(to: string, subject: string, html: string) {
  if (env.NODE_ENV === "development") {
    console.log(`[email] To: ${to}`);
    console.log(`[email] Subject: ${subject}`);
    console.log(`[email] Body:\n${html}`);
    return { ok: true };
  }

  // TODO: integrate with nodemailer/sendgrid/resend in production
  console.warn("[email] Email sending not configured for production");
  return { ok: false, error: "Email service not configured" };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, name?: string) {
  const subject = "Recuperar contraseña - Amobly";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0f172a;">Recuperar contraseña</h1>
      <p>Hola${name ? ` ${name}` : ""},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña en Amobly.</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">
        Este enlace expira en 1 hora. Si no solicitaste restablecer tu contraseña, ignorá este correo.
      </p>
      <p style="color: #64748b; font-size: 14px;">
        O copiá este enlace en tu navegador:<br/>
        <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${resetUrl}</code>
      </p>
    </div>
  `;

  return sendEmail(to, subject, html);
}
