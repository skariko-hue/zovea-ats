import 'dotenv/config';
import nodemailer from 'nodemailer';

function boolFromEnv(v) {
  if (!v) return false;
  return String(v).toLowerCase() === 'true' || String(v) === '1';
}

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  if (!isMailerConfigured()) {
    console.log('[DEV-MAIL] Mailer not configured. Would send:');
    console.log(JSON.stringify({ to, subject, text, html, attachments: attachments.map((a) => ({ filename: a.filename })) }, null, 2));
    return { dev: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: boolFromEnv(process.env.SMTP_SECURE),
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'Zovea Talent <no-reply@zovea.local>',
    to,
    subject,
    text,
    html,
    attachments
  });
}

