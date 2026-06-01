import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InventoryValidationService } from './inventory-validation.service';

@Injectable()
export class InventoryValidationCron {
  private readonly logger = new Logger(InventoryValidationCron.name);

  constructor(private readonly validationService: InventoryValidationService) {}

  @Cron('0 1 * * *')
  async runDailyValidation() {
    try {
      this.logger.log('Starting daily inventory validation...');
      const result = await this.validationService.validate();
      this.logger.log(
        `Validation complete. Status: ${result.status}, Discrepancies: ${result.discrepanciesCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Daily inventory validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
