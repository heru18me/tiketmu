import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const FROM = `"Tiketmu" <${env.SMTP_USER}>`;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const layout = (title: string, body: string): string => `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#2563eb,#7c3aed);background-color:#2563eb;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;">Tiketmu</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h2>
          ${body}
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280;">
          Email ini dikirim otomatis oleh Tiketmu. Mohon jangan membalas email ini.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const button = (href: string, label: string): string =>
  `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">${label}</a></p>`;

const send = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (error) {
    // Email failure must never break the main process
    // eslint-disable-next-line no-console
    console.error(`[mailer] Failed to send "${subject}" to ${to}:`, error);
  }
};

export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  const html = layout(
    `Selamat datang, ${escapeHtml(name)}!`,
    `<p style="line-height:1.6;">Terima kasih telah bergabung dengan Tiketmu. Akunmu sudah aktif dan siap digunakan.</p>
     <p style="line-height:1.6;">Jelajahi ribuan event menarik, mulai dari konser, seminar, workshop, hingga olahraga, lalu amankan tiketmu sekarang.</p>
     ${button(env.FRONTEND_URL + '/events', 'Jelajahi Event')}`,
  );
  await send(to, 'Selamat Datang di Tiketmu', html);
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetLink: string,
): Promise<void> => {
  const html = layout(
    'Reset Password',
    `<p style="line-height:1.6;">Halo ${escapeHtml(name)},</p>
     <p style="line-height:1.6;">Kami menerima permintaan untuk mereset password akunmu. Klik tombol di bawah untuk membuat password baru.</p>
     ${button(resetLink, 'Reset Password')}
     <p style="line-height:1.6;font-size:14px;color:#6b7280;">Jika tombol tidak berfungsi, salin tautan berikut ke browsermu:<br /><span style="word-break:break-all;">${escapeHtml(resetLink)}</span></p>
     <p style="line-height:1.6;font-size:14px;color:#6b7280;">Tautan ini hanya berlaku untuk waktu terbatas. Jika kamu tidak meminta reset password, abaikan email ini.</p>`,
  );
  await send(to, 'Reset Password Tiketmu', html);
};

export const sendTransactionAcceptedEmail = async (
  to: string,
  name: string,
  eventName: string,
  transactionId: string,
): Promise<void> => {
  const html = layout(
    'Transaksi Diterima',
    `<p style="line-height:1.6;">Halo ${escapeHtml(name)},</p>
     <p style="line-height:1.6;">Kabar baik! Pembayaranmu untuk event <strong>${escapeHtml(eventName)}</strong> telah dikonfirmasi oleh organizer.</p>
     <p style="line-height:1.6;">ID Transaksi: <strong>${escapeHtml(transactionId)}</strong></p>
     ${button(env.FRONTEND_URL + '/customer/transactions/' + encodeURIComponent(transactionId), 'Lihat Transaksi')}
     <p style="line-height:1.6;">Sampai jumpa di acara!</p>`,
  );
  await send(to, `Transaksi Diterima - ${eventName}`, html);
};

export const sendTransactionRejectedEmail = async (
  to: string,
  name: string,
  eventName: string,
  reason?: string,
): Promise<void> => {
  const reasonHtml = reason
    ? `<p style="line-height:1.6;">Alasan: <em>${escapeHtml(reason)}</em></p>`
    : '';
  const html = layout(
    'Transaksi Ditolak',
    `<p style="line-height:1.6;">Halo ${escapeHtml(name)},</p>
     <p style="line-height:1.6;">Mohon maaf, transaksimu untuk event <strong>${escapeHtml(eventName)}</strong> ditolak oleh organizer.</p>
     ${reasonHtml}
     <p style="line-height:1.6;">Poin, kupon, dan voucher yang kamu gunakan telah dikembalikan, dan kursi dilepas kembali. Kamu dapat melakukan pemesanan ulang kapan saja.</p>
     ${button(env.FRONTEND_URL + '/events', 'Cari Event Lain')}`,
  );
  await send(to, `Transaksi Ditolak - ${eventName}`, html);
};

export const sendTransactionCancelledEmail = async (
  to: string,
  name: string,
  eventName: string,
): Promise<void> => {
  const html = layout(
    'Transaksi Dibatalkan',
    `<p style="line-height:1.6;">Halo ${escapeHtml(name)},</p>
     <p style="line-height:1.6;">Transaksimu untuk event <strong>${escapeHtml(eventName)}</strong> dibatalkan otomatis karena organizer tidak mengonfirmasi pembayaranmu dalam batas waktu 3 hari.</p>
     <p style="line-height:1.6;">Poin, kupon, dan voucher yang kamu gunakan telah dikembalikan, dan kursi dilepas kembali. Jika sudah melakukan pembayaran, silakan hubungi organizer untuk proses pengembalian dana.</p>
     ${button(env.FRONTEND_URL + '/events', 'Cari Event Lain')}`,
  );
  await send(to, `Transaksi Dibatalkan - ${eventName}`, html);
};
