import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  private async send(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${env.FROM_NAME}" <${env.FROM_EMAIL}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      logger.info('Email sent', { to: options.to, subject: options.subject });
    } catch (error: any) {
      logger.error('Email send failed', { error: error.message, to: options.to });
      throw error;
    }
  }

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
    await this.send({
      to,
      subject: 'Verify your email — Business Insights Pro',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#1976D2;">Welcome to Business Insights Pro</h2>
          <p>Hi ${name},</p>
          <p>Please verify your email address to activate your account.</p>
          <a href="${url}" style="display:inline-block;background:#1976D2;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
            Verify Email
          </a>
          <p style="color:#666;font-size:14px;">Link expires in 24 hours. If you didn't create this account, ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
    await this.send({
      to,
      subject: 'Reset your password — Business Insights Pro',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#1976D2;">Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>Someone requested a password reset for your account. Click below to reset it.</p>
          <a href="${url}" style="display:inline-block;background:#1976D2;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
            Reset Password
          </a>
          <p style="color:#666;font-size:14px;">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  }

  async sendWelcome(to: string, name: string, companyName: string): Promise<void> {
    await this.send({
      to,
      subject: `Welcome to Business Insights Pro, ${name}!`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#1976D2;">You're all set!</h2>
          <p>Hi ${name},</p>
          <p>Your account for <strong>${companyName}</strong> is ready. Start by importing your sales data or exploring the dashboard.</p>
          <a href="${env.CLIENT_URL}/dashboard" style="display:inline-block;background:#1976D2;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
            Go to Dashboard
          </a>
        </div>
      `,
    });
  }

  async sendInvitation(
    to: string,
    name: string,
    companyName: string,
    invitedBy: string,
    token: string,
    tempPassword: string
  ): Promise<void> {
    const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
    await this.send({
      to,
      subject: `You've been invited to ${companyName} on Business Insights Pro`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#1976D2;">You're Invited!</h2>
          <p>Hi ${name},</p>
          <p><strong>${invitedBy}</strong> invited you to join <strong>${companyName}</strong> on Business Insights Pro.</p>
          <p>Your temporary password is: <strong style="font-family:monospace;background:#f5f5f5;padding:4px 8px;border-radius:4px;">${tempPassword}</strong></p>
          <p>Click below to verify your email and set up your account:</p>
          <a href="${url}" style="display:inline-block;background:#1976D2;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
            Accept Invitation
          </a>
          <p style="color:#666;font-size:14px;">Link expires in 7 days. Change your password after first login.</p>
        </div>
      `,
    });
  }

  async sendNotificationEmail(to: string | string[], title: string, message: string, actionUrl?: string): Promise<void> {
    await this.send({
      to,
      subject: `${title} — Business Insights Pro`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#1976D2;">${title}</h2>
          <p>${message}</p>
          ${actionUrl ? `<a href="${actionUrl}" style="display:inline-block;background:#1976D2;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">View Details</a>` : ''}
        </div>
      `,
    });
  }

  async sendAlert(to: string | string[], title: string, message: string, actionUrl?: string): Promise<void> {
    const btnHtml = actionUrl
      ? `<a href="${env.CLIENT_URL}${actionUrl}" style="display:inline-block;padding:12px 24px;background:#1976D2;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;margin-top:16px;">View Details</a>`
      : '';
    await this.send({
      to,
      subject: `${title} — Business Insights Pro`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <div style="background:#1976D2;padding:24px 32px;"><span style="color:#fff;font-size:18px;font-weight:700;">Business Insights Pro</span></div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 12px;color:#212121;font-size:20px;">${title}</h2>
            <p style="margin:0;color:#424242;font-size:15px;line-height:1.6;">${message}</p>
            ${btnHtml}
          </div>
          <div style="background:#f4f6f8;padding:16px 32px;border-top:1px solid #e0e0e0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9e9e9e;">
              &copy; ${new Date().getFullYear()} Business Insights Pro &mdash;
              <a href="${env.CLIENT_URL}/settings/notifications" style="color:#1976D2;text-decoration:none;">Manage preferences</a>
            </p>
          </div>
        </div>
      `,
      text: `${title}\n\n${message}`,
    });
  }

  async sendWeeklyDigest(to: string | string[], companyName: string, insights: Array<{ title: string; message: string }>): Promise<void> {
    const rows = insights.slice(0, 10).map((i) => `
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 4px;font-weight:600;color:#212121;font-size:14px;">${i.title}</p>
        <p style="margin:0;color:#616161;font-size:13px;">${i.message}</p>
      </td></tr>`).join('');

    await this.send({
      to,
      subject: `Weekly Digest — ${companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <div style="background:#1976D2;padding:24px 32px;"><span style="color:#fff;font-size:18px;font-weight:700;">Business Insights Pro</span></div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#212121;font-size:20px;">Weekly Digest &mdash; ${companyName}</h2>
            <p style="margin:0 0 24px;color:#757575;font-size:13px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            <br/>
            <a href="${env.CLIENT_URL}/insights" style="display:inline-block;padding:12px 24px;background:#1976D2;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View Full Insights</a>
          </div>
          <div style="background:#f4f6f8;padding:16px 32px;border-top:1px solid #e0e0e0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9e9e9e;">
              &copy; ${new Date().getFullYear()} Business Insights Pro &mdash;
              <a href="${env.CLIENT_URL}/settings/notifications" style="color:#1976D2;text-decoration:none;">Manage preferences</a>
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendImportResult(to: string, fileName: string, entityType: string, result: { created: number; updated: number; failed: number }): Promise<void> {
    const imported = result.created + result.updated;
    const title = result.failed > 0 ? `Import Completed with Warnings — ${fileName}` : `Import Successful — ${fileName}`;
    await this.send({
      to,
      subject: title,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
          <div style="background:#1976D2;padding:24px 32px;"><span style="color:#fff;font-size:18px;font-weight:700;">Business Insights Pro</span></div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#212121;font-size:20px;">${title}</h2>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:16px;background:#e8f5e9;border-radius:6px;text-align:center;min-width:100px;">
                  <p style="margin:0;font-size:28px;font-weight:700;color:#2e7d32;">${imported}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#388e3c;">IMPORTED</p>
                </td>
                <td width="16"></td>
                <td style="padding:16px;background:#fff3e0;border-radius:6px;text-align:center;min-width:100px;">
                  <p style="margin:0;font-size:28px;font-weight:700;color:#e65100;">${result.failed}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#ef6c00;">FAILED</p>
                </td>
              </tr>
            </table>
            <p style="color:#616161;font-size:14px;">Entity: <strong>${entityType}</strong></p>
            <a href="${env.CLIENT_URL}/imports" style="display:inline-block;padding:12px 24px;background:#1976D2;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View Import History</a>
          </div>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
