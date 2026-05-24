import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TokenCleanupJob {
  private readonly logger = new Logger(TokenCleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scheduled job running daily at 04:00 AM.
   * Purges expired or revoked refresh tokens older than 7 days.
   */
  @Cron('0 4 * * *')
  async purgeExpiredTokens() {
    this.logger.log('Starting expired refresh tokens cleanup...');

    try {
      const now = new Date();
      const threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: threshold } },
            { isRevoked: true, createdAt: { lt: threshold } },
          ],
        },
      });

      this.logger.log(
        `Successfully purged ${result.count} expired or revoked refresh tokens.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to purge expired refresh tokens: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
