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
        const isSmtp = mailProvider === 'smtp';
        const isSes = mailProvider === 'ses';
        if ((isSmtp || isSes) && smtpHost) {
          this.hasDbConfig = true;
          this.logger.log(
            'SMTP/SES dynamic configuration detected from database.',
          );
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
        const isSmtp = mailProvider === 'smtp';
        const isSes = mailProvider === 'ses';
        if ((isSmtp || isSes) && smtpHost) {
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

          let host = smtpHost;
          if (isSes) {
            host = smtpHost.includes('.')
              ? smtpHost
              : `email-smtp.${smtpHost}.amazonaws.com`;
          }

          const port = Number(smtpPort) || 587;
          return nodemailer.createTransport({
            host,
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
    eventSlug?: string,
    payload?: unknown,
  ): Promise<EmailResult> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.log(`SMTP skipped send for subject: "${subject}"`);
      return { ok: false, reason: 'SMTP_UNCONFIGURED' };
    }

    let finalSubject = subject;
    let finalHtml = htmlContent;

    if (eventSlug) {
      try {
        const template = await this.prisma.emailTemplate.findFirst({
          where: { code: eventSlug, isActive: true },
        });
        if (template) {
          const payloadObj = (payload || {}) as Record<string, unknown>;
          const interpolatedSubjectEn = this.interpolate(
            template.subjectEn || '',
            payloadObj,
          );
          const interpolatedSubjectAr = this.interpolate(
            template.subjectAr || '',
            payloadObj,
          );
          const interpolatedBodyEn = this.interpolate(
            template.bodyEn || '',
            payloadObj,
          );
          const interpolatedBodyAr = this.interpolate(
            template.bodyAr || '',
            payloadObj,
          );

          if (interpolatedSubjectEn && interpolatedSubjectAr) {
            finalSubject = `${interpolatedSubjectEn} / ${interpolatedSubjectAr}`;
          } else {
            finalSubject =
              interpolatedSubjectEn || interpolatedSubjectAr || subject;
          }

          if (interpolatedBodyEn && interpolatedBodyAr) {
            finalHtml = `
              <div>
                <div>${interpolatedBodyEn}</div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <div dir="rtl" style="text-align: right;">${interpolatedBodyAr}</div>
              </div>
            `;
          } else {
            const singleBody = interpolatedBodyEn || interpolatedBodyAr;
            if (singleBody) {
              if (interpolatedBodyAr) {
                finalHtml = `<div dir="rtl" style="text-align: right;">${singleBody}</div>`;
              } else {
                finalHtml = `<div>${singleBody}</div>`;
              }
            }
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to process database email template: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    let fromName = 'Otantik Restaurant Alerts';
    let fromEmail = '';

    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
      if (setting) {
        const config = JSON.parse(setting.value) as Record<string, unknown>;
        fromName = (config.senderName ??
          config.sender_name ??
          fromName) as string;
        fromEmail = (config.replyToEmail ??
          config.reply_to_email ??
          '') as string;
      }
    } catch (err) {
      // Ignore
    }

    if (!fromEmail) {
      fromEmail = this.config.get<string>(
        'SMTP_FROM',
        'noreply@otantikrestuarant.com',
      );
    }

    const from = `"${fromName}" <${fromEmail}>`;
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    try {
      await transporter.sendMail({
        from,
        to: recipients,
        subject: finalSubject,
        html: this.wrapInBrandTemplate(finalSubject, finalHtml),
      });
      this.logger.log(`Successfully dispatched email to: ${recipients}`);
      return { ok: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP transmission failed: ${msg}`);
      return { ok: false, reason: 'SEND_FAILED', error: msg };
    }
  }

  private safeStringify(val: unknown): string {
    if (val === null || val === undefined) {
      return '';
    }
    if (typeof val === 'string') {
      return val;
    }
    if (
      typeof val === 'number' ||
      typeof val === 'boolean' ||
      typeof val === 'bigint'
    ) {
      return val.toString();
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    if (typeof val === 'symbol') {
      return val.toString();
    }
    return '';
  }

  private interpolate(
    templateStr: string,
    payload: Record<string, unknown>,
  ): string {
    if (!templateStr) return '';
    return templateStr.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();

      // 1. Direct match
      if (payload[trimmedKey] !== undefined) {
        return this.safeStringify(payload[trimmedKey]);
      }

      // 2. Try stripping prefixes (e.g. item_name -> name)
      const cleanKey = trimmedKey.replace(/^[a-zA-Z0-9]+_/, '');
      if (payload[cleanKey] !== undefined) {
        return this.safeStringify(payload[cleanKey]);
      }

      // 3. Manual mappings for specific expected fields from NotificationTemplateService:
      if (
        trimmedKey === 'item_currentStock' &&
        payload.qtyOnHand !== undefined
      ) {
        return this.safeStringify(payload.qtyOnHand);
      }
      if (
        trimmedKey === 'item_warehouse' &&
        payload.warehouseName !== undefined
      ) {
        return this.safeStringify(payload.warehouseName);
      }
      if (
        trimmedKey === 'purchaseorder_poNumber' &&
        payload.poNumber !== undefined
      ) {
        return this.safeStringify(payload.poNumber);
      }
      if (
        trimmedKey === 'purchaseorder_totalAmount' &&
        payload.totalAmount !== undefined
      ) {
        return this.safeStringify(payload.totalAmount);
      }
      if (
        trimmedKey === 'purchaseorder_status' &&
        payload.status !== undefined
      ) {
        return this.safeStringify(payload.status);
      }

      // 4. Try camelCase conversion (e.g. item_name -> itemName)
      const camelCased = trimmedKey.replace(
        /_([a-z])/g,
        (_match: string, g: string) => g.toUpperCase(),
      );
      if (payload[camelCased] !== undefined) {
        return this.safeStringify(payload[camelCased]);
      }

      return match;
    });
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
            color: #1A1A1A;
          }
          .container {
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            border: 1px solid #E5E7EB;
          }
          .header {
            background-color: #ffffff;
            padding: 25px 20px;
            text-align: center;
            border-bottom: 1px solid #E5E7EB;
          }
          .content {
            padding: 30px 20px;
            line-height: 1.6;
            color: #1A1A1A;
          }
          .content h2 {
            color: #715b38;
            font-family: 'Georgia', serif;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .footer {
            background-color: #f9fafb;
            color: #5c5f5e;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #E5E7EB;
          }
          .btn {
            display: inline-block;
            background-color: #b48e67;
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
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 20px; color: #1A1A1A;">
        <div class="container" style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); border: 1px solid #E5E7EB;">
          <div class="header" style="background-color: #ffffff; padding: 25px 20px; text-align: center; border-bottom: 1px solid #E5E7EB;">
            <img src="https://otantikkitchen.com/Otantik-Restaurant-logo-BANNER.png" alt="OTANTIK RESTAURANT" style="display: block; margin: 0 auto; max-height: 45px; width: auto; border: 0; font-family: 'Georgia', serif; font-size: 20px; color: #715b38; letter-spacing: 2px; font-weight: bold; text-align: center;" />
          </div>
          <div class="content" style="padding: 30px 20px; line-height: 1.6; color: #1A1A1A;">
            <h2 style="color: #715b38; font-family: 'Georgia', serif; font-size: 20px; margin-top: 0; margin-bottom: 15px; font-weight: bold;">${title}</h2>
            ${body}
          </div>
          <div class="footer" style="background-color: #f9fafb; color: #5c5f5e; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0 0 10px 0;">This is an automated notification from the Otantik Restaurant Enterprise system.</p>
            <p style="margin: 0;">&copy; 2026 Otantik Restaurant. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection(config: {
    mailProvider?: string;
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

      let host = config.smtpHost;
      if (config.mailProvider === 'ses' && host) {
        host = host.includes('.') ? host : `email-smtp.${host}.amazonaws.com`;
      }

      const port = Number(config.smtpPort) || 587;
      const transporter = nodemailer.createTransport({
        host,
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
