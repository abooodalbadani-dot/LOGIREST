import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../database/prisma.service';
import { decrypt } from '../admin/crypto.util';

export type EmailResult =
  | { ok: true }
  | { ok: false; reason: 'SMTP_UNCONFIGURED' | 'SEND_FAILED'; error?: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private hasDbConfig = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    void this.initializeTransporter();
  }

  get isSmtpConfigured(): boolean {
    return (
      this.hasDbConfig || this.config.get<string>('SMTP_HOST') !== undefined
    );
  }

  private async initializeTransporter() {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
      if (setting) {
        const config = JSON.parse(setting.value) as Record<string, unknown>;
        const mailProvider = (config.mailProvider ?? config.mail_provider) as
          | string
          | undefined;
        const smtpHost = (config.smtpHost ?? config.smtp_host) as
          | string
          | undefined;
        if (mailProvider === 'smtp' && smtpHost) {
          this.hasDbConfig = true;
          this.logger.log('SMTP dynamic configuration detected from database.');
          return;
        }
      }
    } catch (err) {
      // Database might not be fully initialized on startup
    }

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn(
        'SMTP_HOST is not configured. Email notifications will be skipped.',
      );
    }
  }

  private async getTransporter(): Promise<nodemailer.Transporter | null> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });

      if (setting) {
        const config = JSON.parse(setting.value) as Record<string, unknown>;
        const mailProvider = (config.mailProvider ?? config.mail_provider) as
          | string
          | undefined;
        const smtpHost = (config.smtpHost ?? config.smtp_host) as
          | string
          | undefined;
        const smtpPassword = (config.smtpPassword ?? config.smtp_password) as
          | string
          | undefined;
        const smtpUser = (config.smtpUser ?? config.smtp_user) as
          | string
          | undefined;
        const smtpPort = (config.smtpPort ?? config.smtp_port) as
          | string
          | number
          | undefined;
        const smtpEncryption = (config.smtpEncryption ??
          config.smtp_encryption) as string | undefined;
        if (mailProvider === 'smtp' && smtpHost) {
          this.hasDbConfig = true;
          let password = '';
          if (smtpPassword) {
            try {
              password = decrypt(smtpPassword);
            } catch (err) {
              this.logger.error(
                `Failed to decrypt SMTP password: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }

          const port = Number(smtpPort) || 587;
          return nodemailer.createTransport({
            host: smtpHost,
            port,
            secure: port === 465 || smtpEncryption === 'ssl',
            auth:
              smtpUser && password
                ? { user: smtpUser, pass: password }
                : undefined,
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to read SMTP configuration from database: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Fallback to environment variables
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host) {
      this.hasDbConfig = false;
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }

    return null;
  }

  /**
   * Dispatches email templates depending on the outbox event type.
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    htmlContent: string,
  ): Promise<EmailResult> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.log(`SMTP skipped send for subject: "${subject}"`);
      return { ok: false, reason: 'SMTP_UNCONFIGURED' };
    }

    const from = this.config.get<string>('SMTP_FROM', 'noreply@logirest.app');
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    try {
      await transporter.sendMail({
        from,
        to: recipients,
        subject,
        html: this.wrapInBrandTemplate(subject, htmlContent),
      });
      this.logger.log(`Successfully dispatched email to: ${recipients}`);
      return { ok: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP transmission failed: ${msg}`);
      return { ok: false, reason: 'SEND_FAILED', error: msg };
    }
  }

  /**
   * Wraps specific template fragments in a professional corporate brand header and footer.
   */
  private wrapInBrandTemplate(title: string, body: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f7f9fc;
            margin: 0;
            padding: 20px;
            color: #333333;
          }
          .container {
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            border: 1px solid #e1e8ed;
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 30px 20px;
            line-height: 1.6;
          }
          .footer {
            background-color: #f1f5f9;
            color: #64748b;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
          }
          .btn {
            display: inline-block;
            background-color: #3b82f6;
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin-top: 20px;
          }
          .alert-badge {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            color: #b91c1c;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LogiRest Inventory Management</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            ${body}
          </div>
          <div class="footer">
            <p>This is an automated notification from the LogiRest Enterprise system.</p>
            <p>&copy; 2026 LogiRest Inc. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection(config: {
    smtpHost?: string;
    smtpPort?: number | string;
    smtpUser?: string;
    smtpPassword?: string;
    smtpEncryption?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      let password = config.smtpPassword;
      if (password === '********') {
        const setting = await this.prisma.systemSetting.findUnique({
          where: { key: 'system_settings' },
        });
        if (setting) {
          const saved = JSON.parse(setting.value) as Record<string, unknown>;
          const storedPass = (saved.smtpPassword ?? saved.smtp_password) as
            | string
            | undefined;
          if (storedPass) {
            password = decrypt(storedPass);
          }
        }
      }
      const port = Number(config.smtpPort) || 587;
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port,
        secure: port === 465 || config.smtpEncryption === 'ssl',
        auth:
          config.smtpUser && password
            ? { user: config.smtpUser, pass: password }
            : undefined,
        connectionTimeout: 5000,
      });

      await transporter.verify();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
