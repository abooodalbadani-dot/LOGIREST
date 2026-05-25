import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host) {
      this.logger.warn(
        'SMTP_HOST is not configured. Email notifications will be skipped.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // True for 465, false for other ports
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /**
   * Dispatches email templates depending on the outbox event type.
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`SMTP skipped send for subject: "${subject}"`);
      return true; // Return success so worker doesn't endlessly retry unconfigured SMTP
    }

    const from = this.config.get<string>('SMTP_FROM', 'noreply@logirest.app');
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    try {
      await this.transporter.sendMail({
        from,
        to: recipients,
        subject,
        html: this.wrapInBrandTemplate(subject, htmlContent),
      });
      this.logger.log(`Successfully dispatched email to: ${recipients}`);
      return true;
    } catch (error) {
      this.logger.error(
        `SMTP transmission failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
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
}
