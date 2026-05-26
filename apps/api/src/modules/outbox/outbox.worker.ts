import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from './email.service';
import { Role } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';

import { correlationStorage } from '../../common/correlation.context';

interface OutboxPayload {
  id?: string;
  createdById?: string;
  documentNumber?: string;
  warehouseName?: string;
  warehouseId?: string;
  itemName?: string;
  sku?: string;
  qtyOnHand?: number;
  reorderPoint?: number;
  uomCode?: string;
  supplierEmail?: string;
  supplierId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string | null;
  timestamp?: string;
  issueId?: string;
  issueNumber?: string;
  postedByUserId?: string;
  totalLines?: number;
}

@Processor('outbox')
export class OutboxWorker extends WorkerHost {
  private readonly logger = new Logger(OutboxWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  /**
   * BullMQ worker job processing entrypoint.
   */
  async process(
    job: Job<{ eventId: string; correlationId?: string }>,
  ): Promise<void> {
    const { eventId, correlationId } = job.data;

    const runInContext = async () => {
      this.logger.log(`Processing outbox job: ${job.id} for event: ${eventId}`);

      // Fetch the OutboxEvent database log
      const event = await this.prisma.outboxEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        this.logger.warn(
          `Outbox event with ID ${eventId} not found. Skipping.`,
        );
        return;
      }

      if (event.status === 'SUCCEEDED') {
        this.logger.log(
          `Event ${eventId} has already been processed successfully.`,
        );
        return;
      }

      try {
        // 1. Resolve target recipients and templates based on the event type
        const recipients = await this.resolveRecipients(
          event.eventType,
          event.payload,
        );
        if (recipients.length === 0) {
          this.logger.log(
            `No active recipients resolved for event ${eventId}. Skipping dispatch.`,
          );
        } else {
          const { subject, body } = this.renderTemplate(
            event.eventType,
            event.payload,
          );
          // 2. Dispatch email notifications
          const result = await this.email.sendEmail(recipients, subject, body);

          // 3. Handle email result
          if (!result.ok) {
            if (result.reason === 'SMTP_UNCONFIGURED') {
              await this.prisma.outboxEvent.update({
                where: { id: eventId },
                data: {
                  status: 'FAILED',
                  attempts: { increment: 1 },
                  processedAt: new Date(),
                  lastError: 'SMTP_NOT_CONFIGURED',
                },
              });

              await this.prisma.notificationLog.create({
                data: {
                  targetRole: Role.ADMIN,
                  message:
                    'System email server is not configured. Outbox events are failing.',
                  isRead: false,
                },
              });

              this.logger.warn(
                `Event ${eventId} marked FAILED: SMTP not configured. Admin notified.`,
              );
              return;
            }

            throw new Error(result.error ?? 'SEND_FAILED');
          }
        }

        // 4. Mark success
        await this.prisma.outboxEvent.update({
          where: { id: eventId },
          data: {
            status: 'SUCCEEDED',
            attempts: { increment: 1 },
            processedAt: new Date(),
            lastError: null,
          },
        });
        this.logger.log(`Event ${eventId} successfully processed.`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to process event ${eventId}. Error: ${errorMsg}`,
        );

        this.metricsService.failedOutboxEventsCounter.inc();

        const nextAttempts = event.attempts + 1;
        const finalStatus = nextAttempts >= 5 ? 'FAILED' : 'PENDING';

        await this.prisma.outboxEvent.update({
          where: { id: eventId },
          data: {
            status: finalStatus,
            attempts: nextAttempts,
            lastError: errorMsg,
          },
        });

        if (finalStatus === 'PENDING') {
          throw error;
        }
      }
    };

    if (correlationId) {
      await correlationStorage.run(correlationId, runInContext);
    } else {
      await runInContext();
    }
  }

  /**
   * Resolves email addresses dynamically from active database roles matching the event's scopes.
   */
  private async resolveRecipients(
    eventType: string,
    payload: unknown,
  ): Promise<string[]> {
    let targetRoles: Role[] = [];
    const data = (payload || {}) as OutboxPayload;

    switch (eventType) {
      case 'SECURITY_ALERT_REPLAY_ATTACK':
        targetRoles = [Role.ADMIN];
        break;
      case 'ISSUE_POSTED':
        targetRoles = [Role.ADMIN, Role.INV_MGR];
        break;
      case 'PR_SUBMITTED':
        targetRoles = [Role.APPROVER];
        break;
      case 'PR_APPROVED':
        // Notify the creator of the PR (or PO officers)
        if (data.createdById) {
          const creator = await this.prisma.user.findUnique({
            where: { id: data.createdById, isActive: true },
          });
          if (creator) return [creator.email];
        }
        targetRoles = [Role.PROC_OFFICER];
        break;
      case 'GRN_POSTED':
      case 'ADJUSTMENT_POSTED':
      case 'STOCKTAKE_POSTED':
      case 'LOW_STOCK_ALERT':
        targetRoles = [Role.INV_MGR];
        if (
          eventType === 'ADJUSTMENT_POSTED' ||
          eventType === 'STOCKTAKE_POSTED'
        ) {
          targetRoles.push(Role.AUDITOR);
        }
        break;
      case 'KITCHEN_REQUEST_SUBMITTED':
      case 'TRANSFER_SHIPPED':
      case 'STOCKTAKE_STARTED':
        targetRoles = [Role.WH_KEEPER];
        break;
      case 'KITCHEN_REQUEST_POSTED':
        targetRoles = [Role.KITCHEN_CHIEF];
        break;
      case 'TRANSFER_RECEIVED':
        // Notify the source warehouse keeper
        targetRoles = [Role.WH_KEEPER];
        break;
      case 'SUPPLIER_PO_NOTIFIED':
      case 'SUPPLIER_GRN_NOTIFIED':
        if (data.supplierEmail) {
          return [data.supplierEmail];
        }
        return [];
      default:
        return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: targetRoles },
        isActive: true,
      },
      select: { email: true },
    });

    return users.map((u) => u.email);
  }

  /**
   * Renders the dynamic email body elements and template lines.
   */
  private renderTemplate(
    eventType: string,
    payload: unknown,
  ): { subject: string; body: string } {
    let subject = '';
    let body = '';
    const data = (payload || {}) as OutboxPayload;

    const docNo = data.documentNumber || data.id || 'N/A';

    switch (eventType) {
      case 'SECURITY_ALERT_REPLAY_ATTACK':
        subject = '🚨 SECURITY ALERT: Token Replay Attack Detected';
        body = `
          <h2>Security Alert — Refresh Token Replay</h2>
          <p>A refresh token replay attack was detected at <strong>${data.timestamp || 'N/A'}</strong>.</p>
          <p><strong>User ID:</strong> ${data.userId || 'N/A'}</p>
          <p><strong>Session ID:</strong> ${data.sessionId || 'N/A'}</p>
          <p><strong>IP Address:</strong> ${data.ipAddress ?? 'Unknown'}</p>
          <p>All tokens for this session have been revoked. Investigate immediately.</p>
        `;
        break;
      case 'ISSUE_POSTED':
        subject = `Stock Issue Posted — ${data.issueNumber || docNo} / تم ترحيل صرف مخزون`;
        body = `
          <h2>Inventory Issue Posted / تم ترحيل صرف مخزون</h2>
          <p>Issue <strong>${data.issueNumber || docNo}</strong> has been posted.</p>
          <p>تم ترحيل مستند الصرف رقم <strong>${data.issueNumber || docNo}</strong> بنجاح في النظام.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Total Lines / إجمالي البنود:</strong> ${data.totalLines || 0}</p>
          <p><strong>Warehouse ID / معرف المستودع:</strong> ${data.warehouseId || 'N/A'}</p>
          <p><strong>Posted By / تم الترحيل بواسطة:</strong> ${data.postedByUserId || 'N/A'}</p>
          <p><strong>Timestamp / وقت الترحيل:</strong> ${data.timestamp || 'N/A'}</p>
        `;
        break;
      case 'PR_SUBMITTED':
        subject = `Purchase Request ${docNo} awaiting approval`;
        body = `
          <p>Hello,</p>
          <p>Purchase Request <strong>${docNo}</strong> has been submitted and is currently awaiting your review and approval.</p>
          <p><strong>Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p>Please log in to the LogiRest console to view the details.</p>
        `;
        break;
      case 'PR_APPROVED':
        subject = `Your PR ${docNo} has been approved`;
        body = `
          <p>Hello,</p>
          <p>Your Purchase Request <strong>${docNo}</strong> has been fully approved by the management board.</p>
          <p>The procurement process has been initiated.</p>
        `;
        break;
      case 'GRN_POSTED':
        subject = `GRN ${docNo} posted — stock updated`;
        body = `
          <p>Hello,</p>
          <p>Goods Received Note <strong>${docNo}</strong> has been posted. The physical inventory levels have been updated in the warehouse.</p>
        `;
        break;
      case 'KITCHEN_REQUEST_SUBMITTED':
        subject = `Kitchen Request ${docNo} submitted`;
        body = `
          <p>Hello,</p>
          <p>A new Kitchen Request <strong>${docNo}</strong> has been submitted. Please prepare the items for fulfillment.</p>
        `;
        break;
      case 'TRANSFER_SHIPPED':
        subject = `Transfer ${docNo} in transit to you`;
        body = `
          <p>Hello,</p>
          <p>Inventory Transfer <strong>${docNo}</strong> has been shipped from the source warehouse and is currently in transit to your branch.</p>
        `;
        break;
      case 'LOW_STOCK_ALERT':
        subject = `⚠️ Low stock: ${data.itemName || 'Item'} in ${data.warehouseName || 'Warehouse'}`;
        body = `
          <div class="alert-badge">
            <strong>Critical Alert:</strong> The inventory level has dropped below the reorder point!
          </div>
          <p><strong>Item</strong>: ${data.itemName || 'N/A'} (SKU: ${data.sku || 'N/A'})</p>
          <p><strong>Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Current Balance</strong>: ${data.qtyOnHand || 0} ${data.uomCode || ''}</p>
          <p><strong>Reorder Threshold</strong>: ${data.reorderPoint || 0} ${data.uomCode || ''}</p>
          <p>Please initiate a new purchase request to replenish stock immediately.</p>
        `;
        break;
      case 'SUPPLIER_PO_NOTIFIED':
        subject = `Purchase Order ${docNo} Approved`;
        body = `
          <p>Dear Supplier,</p>
          <p>We are pleased to inform you that Purchase Order <strong>${docNo}</strong> has been approved.</p>
          <p>Please find the PO details in our inventory system or wait for the PDF document request.</p>
        `;
        break;
      case 'SUPPLIER_GRN_NOTIFIED':
        subject = `Goods Receipt Confirmed for PO/GRN ${docNo}`;
        body = `
          <p>Dear Supplier,</p>
          <p>This is to confirm that the items from Purchase Order/Goods Received Note <strong>${docNo}</strong> have been received and registered in our warehouse.</p>
          <p>Thank you for your service.</p>
        `;
        break;
      default:
        subject = `Inventory notification: ${eventType}`;
        body = `<p>An automated notification event of type: <strong>${eventType}</strong> occurred.</p>`;
        break;
    }

    return { subject, body };
  }
}
