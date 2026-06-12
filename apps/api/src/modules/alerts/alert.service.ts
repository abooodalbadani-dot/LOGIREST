import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSlackAlert(
    message: string,
    title = '🚨 LogiRest Alert',
    details?: Record<string, unknown>,
  ) {
    const webhookUrl = this.config.get<string>('ALERT_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn(
        'ALERT_WEBHOOK_URL is not configured. Skipping Slack alert dispatch.',
      );
      return;
    }

    try {
      const blocks: Array<Record<string, unknown>> = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: title,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Alert Details:*\n${message}`,
          },
        },
      ];

      if (details) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
          },
        });
      }

      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Timestamp:* ${new Date().toISOString()} | *Environment:* ${this.config.get<string>('NODE_ENV', 'development')}`,
          },
        ],
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `${title}: ${message}`,
          blocks,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      this.logger.log(`Slack alert successfully dispatched.`);
    } catch (error) {
      this.logger.error(
        `Failed to send Slack alert: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
