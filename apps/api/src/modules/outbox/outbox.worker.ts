import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from './email.service';
import { Role, DocumentType } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';
import * as crypto from 'crypto';

import { correlationStorage } from '../../common/correlation.context';

interface OutboxPayload {
  id?: string;
  createdById?: string;
  documentNumber?: string;
  warehouseName?: string;
  warehouseId?: string;
  toWarehouseId?: string;
  fromWarehouseId?: string;
  userName?: string;
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
  lotNumber?: string;
  expiryDate?: string;
  email?: string;
  name?: string;
  resetUrl?: string;
  requestedById?: string;
  postedByName?: string;
  formattedDate?: string;
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
        // Reset the stale threshold window by updating createdAt to now
        await this.prisma.outboxEvent.update({
          where: { id: eventId },
          data: { createdAt: new Date() },
        });

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
          // Resolve presentation-ready payload
          const enrichedPayload = await this.enrichPayload(
            event.eventType,
            event.payload,
          );

          const { subject, body } = await this.renderTemplate(
            event.eventType,
            enrichedPayload,
          );
          // 2. Dispatch email notifications
          const result = await this.email.sendEmail(
            recipients,
            subject,
            body,
            event.eventType,
            enrichedPayload,
          );

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
          // 3b. Dispatch in-app NotificationLog entries for target roles
          const targetRoles = this.resolveTargetRoles(event.eventType);
          const data = (event.payload || {}) as OutboxPayload;
          const docType = this.mapEventToDocType(event.eventType);

          for (const role of targetRoles) {
            try {
              await this.prisma.notificationLog.create({
                data: {
                  targetRole: role,
                  warehouseId: data.warehouseId || null,
                  message: subject || `Notification: ${event.eventType}`,
                  documentType: docType,
                  documentId: data.id || data.issueId || null,
                  isRead: false,
                },
              });
            } catch (notifErr) {
              this.logger.warn(`Failed to create NotificationLog for role ${role}: ${notifErr}`);
            }
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

        if (
          errorMsg.includes('Engine is not yet connected') ||
          errorMsg.includes('Response from the Engine was empty') ||
          ((errorMsg.includes('connection') ||
            errorMsg.includes('Connection')) &&
            (errorMsg.includes('Prisma') ||
              errorMsg.includes('database') ||
              errorMsg.includes('db')))
        ) {
          this.logger.warn(
            `Outbox worker detected database disconnection. Skipping retry status update.`,
          );
          return;
        }

        this.metricsService.failedOutboxEventsCounter.inc();

        const nextAttempts = event.attempts + 1;
        const finalStatus = nextAttempts >= 5 ? 'FAILED' : 'PENDING';

        try {
          await this.prisma.outboxEvent.update({
            where: { id: eventId },
            data: {
              status: finalStatus,
              attempts: nextAttempts,
              lastError: errorMsg,
            },
          });
        } catch (updateErr) {
          const errString =
            updateErr instanceof Error ? updateErr.message : String(updateErr);
          this.logger.warn(
            `Failed to update outbox event retry status: ${errString}`,
          );
        }

        if (finalStatus === 'PENDING') {
          throw error;
        }
      }
    };

    const effectiveCorrelationId = correlationId || crypto.randomUUID();
    await correlationStorage.run(effectiveCorrelationId, runInContext);
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
        targetRoles = [Role.APPROVER, Role.PROC_MGR];
        break;
      case 'PO_SUBMITTED':
        targetRoles = [Role.PROC_MGR, Role.APPROVER, Role.GM];
        break;
      case 'PR_APPROVED':
      case 'PR_REJECTED': {
        const emails: string[] = [];
        if (data.createdById) {
          const creator = await this.prisma.user.findUnique({
            where: { id: data.createdById, isActive: true },
          });
          if (creator) {
            emails.push(creator.email);
          }
        }
        if (eventType === 'PR_APPROVED') {
          const officers = await this.prisma.user.findMany({
            where: { role: Role.PROC_OFFICER, isActive: true },
            select: { email: true },
          });
          emails.push(...officers.map((u) => u.email));
        }
        return Array.from(new Set(emails));
      }
      case 'GRN_POSTED':
        targetRoles = [Role.PROC_MGR, Role.APPROVER, Role.GM];
        break;
      case 'LOW_STOCK_ALERT':
        targetRoles = [Role.INV_MGR, Role.PROC_MGR];
        break;
      case 'EXPIRY_WARNING':
      case 'EXPIRY_WARNING_ALERT': {
        const whId = data.warehouseId;
        const keepers = whId
          ? await this.prisma.user.findMany({
              where: {
                role: Role.WH_KEEPER,
                isActive: true,
                warehouseScopes: {
                  some: { warehouseId: whId },
                },
              },
              select: { email: true, notificationPreferences: true },
            })
          : [];
        const managers = await this.prisma.user.findMany({
          where: { role: Role.INV_MGR, isActive: true },
          select: { email: true, notificationPreferences: true },
        });
        const allUsers = [...keepers, ...managers];
        const emails = allUsers
          .filter((u) => {
            if (!u.notificationPreferences) return true;
            const prefs = u.notificationPreferences as Record<string, unknown>;
            if (prefs.expiry === false) return false;
            return true;
          })
          .map((u) => u.email);
        return Array.from(new Set(emails));
      }
      case 'ADJUSTMENT_POSTED':
        targetRoles = [Role.ADMIN, Role.GM, Role.INV_MGR];
        break;
      case 'STOCKTAKE_POSTED':
        targetRoles = [Role.ADMIN, Role.GM];
        break;
      case 'PO_APPROVED':
        targetRoles = [Role.PROC_MGR, Role.APPROVER, Role.GM];
        break;
      case 'KITCHEN_REQUEST_SUBMITTED': {
        const whId = data.warehouseId;
        if (!whId) return [];
        const keepers = await this.prisma.user.findMany({
          where: {
            role: Role.WH_KEEPER,
            isActive: true,
            warehouseScopes: {
              some: { warehouseId: whId },
            },
          },
          select: { email: true },
        });
        return keepers.map((u) => u.email);
      }
      case 'STOCKTAKE_STARTED': {
        const whId = data.warehouseId;
        if (!whId) return [];
        const keepers = await this.prisma.user.findMany({
          where: {
            role: Role.WH_KEEPER,
            isActive: true,
            warehouseScopes: {
              some: { warehouseId: whId },
            },
          },
          select: { email: true },
        });
        return keepers.map((u) => u.email);
      }
      case 'TRANSFER_SHIPPED': {
        const receivingWhId = data.warehouseId || data.toWarehouseId;
        if (!receivingWhId) return [];
        const keepers = await this.prisma.user.findMany({
          where: {
            role: Role.WH_KEEPER,
            isActive: true,
            warehouseScopes: {
              some: { warehouseId: receivingWhId },
            },
          },
          select: { email: true },
        });
        return keepers.map((u) => u.email);
      }
      case 'TRANSFER_RECEIVED': {
        const sendingWhId = data.fromWarehouseId;
        const keepers = sendingWhId
          ? await this.prisma.user.findMany({
              where: {
                role: Role.WH_KEEPER,
                isActive: true,
                warehouseScopes: {
                  some: { warehouseId: sendingWhId },
                },
              },
              select: { email: true },
            })
          : [];
        const managers = await this.prisma.user.findMany({
          where: { role: Role.INV_MGR, isActive: true },
          select: { email: true },
        });
        const emails = new Set([
          ...keepers.map((u) => u.email),
          ...managers.map((u) => u.email),
        ]);
        return Array.from(emails);
      }
      case 'KITCHEN_REQUEST_POSTED': {
        if (data.requestedById) {
          const chief = await this.prisma.user.findUnique({
            where: { id: data.requestedById, isActive: true },
          });
          if (chief) return [chief.email];
        }
        return [];
      }
      case 'SUPPLIER_PO_NOTIFIED':
      case 'SUPPLIER_GRN_NOTIFIED':
        if (data.supplierEmail) {
          return [data.supplierEmail];
        }
        return [];
      case 'PASSWORD_RESET_REQUESTED':
        if (data.email) {
          return [data.email];
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
      select: {
        email: true,
        notificationPreferences: true,
      },
    });

    return users
      .filter((u) => {
        if (!u.notificationPreferences) return true;
        const prefs = u.notificationPreferences as Record<string, unknown>;
        if (eventType === 'LOW_STOCK_ALERT' && prefs.lowStock === false)
          return false;
        if (eventType === 'PR_SUBMITTED' && prefs.pendingApproval === false)
          return false;
        if (
          eventType === 'SECURITY_ALERT_REPLAY_ATTACK' &&
          prefs.security === false
        )
          return false;
        if (eventType === 'GRN_POSTED' && prefs.poFinalized === false)
          return false;
        return true;
      })
      .map((u) => u.email);
  }

  /**
   * Renders the dynamic email body elements and template lines.
   */
  private async renderTemplate(
    eventType: string,
    payload: unknown,
  ): Promise<{ subject: string; body: string }> {
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
          <p><strong>Warehouse / المستودع:</strong> ${data.warehouseName || 'N/A'}</p>
          <p><strong>Posted By / تم الترحيل بواسطة:</strong> ${data.postedByName || 'N/A'}</p>
          <p><strong>Timestamp / وقت الترحيل:</strong> ${data.formattedDate || 'N/A'}</p>
        `;
        break;
      case 'PR_SUBMITTED':
        subject = `Purchase Request ${docNo} awaiting approval`;
        body = `
          <p>Hello,</p>
          <p>Purchase Request <strong>${docNo}</strong> has been submitted and is currently awaiting your review and approval.</p>
          <p><strong>Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p>Please log in to the Otantik Restaurant console to view the details.</p>
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
      case 'KITCHEN_REQUEST_POSTED':
        subject = `Kitchen Request ${docNo} Fulfilled`;
        body = `
          <p>Hello,</p>
          <p>Kitchen Request <strong>${docNo}</strong> has been successfully fulfilled.</p>
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
      case 'EXPIRY_WARNING':
        subject = `⚠️ Expiry Alert: ${data.itemName || 'Item'} in ${data.warehouseName || 'Warehouse'} expiring soon`;
        body = `
          <div class="alert-badge">
            <strong>Expiry Warning / تحذير انتهاء الصلاحية:</strong> A lot is approaching its expiry date within 7 days!
          </div>
          <p><strong>Item / الصنف</strong>: ${data.itemName || 'N/A'} (SKU: ${data.sku || 'N/A'})</p>
          <p><strong>Lot Number / رقم التشغيلة</strong>: ${data.lotNumber || 'N/A'}</p>
          <p><strong>Warehouse / المستودع</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Qty On Hand / الكمية المتوفرة</strong>: ${data.qtyOnHand || 0} ${data.uomCode || ''}</p>
          <p><strong>Expiry Date / تاريخ انتهاء الصلاحية</strong>: ${data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : 'N/A'}</p>
          <p>Please take immediate action to consume or write off this stock / يرجى اتخاذ إجراء فوري لاستهلاك أو شطب هذا المخزون.</p>
        `;
        break;
      case 'EXPIRY_WARNING_ALERT':
        subject = `⚠️ Lot Expiry Warning (30 Days): ${data.lotNumber || 'N/A'}`;
        body = `
          <div class="alert-badge">
            <strong>Expiry Warning / تحذير انتهاء الصلاحية:</strong> A lot is approaching its expiry date within 30 days!
          </div>
          <p><strong>Item / الصنف</strong>: ${data.itemName || 'N/A'} (SKU: ${data.sku || 'N/A'})</p>
          <p><strong>Lot Number / رقم التشغيلة</strong>: ${data.lotNumber || 'N/A'}</p>
          <p><strong>Warehouse / المستودع</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Qty On Hand / الكمية المتوفرة</strong>: ${data.qtyOnHand || 0} ${data.uomCode || ''}</p>
          <p><strong>Expiry Date / تاريخ انتهاء الصلاحية</strong>: ${data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : 'N/A'}</p>
          <p>Please take immediate action to consume or write off this stock / يرجى اتخاذ إجراء فوري لاستهلاك أو شطب هذا المخزون.</p>
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
      case 'PASSWORD_RESET_REQUESTED':
        subject = '🔐 Otantik Restaurant Password Reset Request';
        body = `
          <p>Dear ${data.name || 'User'},</p>
          <p>We received a request to reset the password for your Otantik Restaurant account.</p>
          <p>Please click the button below to choose a new password. This link is valid for 1 hour.</p>
          <p><a href="${data.resetUrl || '#'}" class="btn" style="background-color: #b48e67; color: #ffffff; border-radius: 6px; text-decoration: none; padding: 12px 24px; font-weight: bold; display: inline-block; margin-top: 20px;">Reset Password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        `;
        break;
      case 'ADJUSTMENT_POSTED':
        subject = `Stock Adjustment Posted — ${docNo}`;
        body = `
          <p>Hello,</p>
          <p>Stock Adjustment <strong>${docNo}</strong> has been posted successfully.</p>
          <p><strong>Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Posted By</strong>: ${data.userName || 'N/A'}</p>
        `;
        break;
      case 'STOCKTAKE_POSTED':
        subject = `Stocktake Finalized — ${docNo}`;
        body = `
          <p>Hello,</p>
          <p>Stocktake Session <strong>${docNo}</strong> has been finalized and posted.</p>
          <p><strong>Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Finalized By</strong>: ${data.userName || 'N/A'}</p>
        `;
        break;
      case 'TRANSFER_RECEIVED':
        subject = `Transfer ${docNo} Received`;
        body = `
          <p>Hello,</p>
          <p>Inventory Transfer <strong>${docNo}</strong> has been fully received and verified.</p>
          <p><strong>Destination Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Received By</strong>: ${data.userName || 'N/A'}</p>
        `;
        break;
      case 'PR_REJECTED':
        subject = `Your PR ${docNo} has been rejected`;
        body = `
          <p>Hello,</p>
          <p>Your Purchase Request <strong>${docNo}</strong> has been rejected by the management board.</p>
          <p><strong>Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Rejected By</strong>: ${data.userName || 'N/A'}</p>
        `;
        break;
      case 'PO_APPROVED':
        subject = `Purchase Order ${docNo} Approved`;
        body = `
          <p>Hello,</p>
          <p>Purchase Order <strong>${docNo}</strong> has been approved by management.</p>
          <p><strong>Warehouse</strong>: ${data.warehouseName || 'N/A'}</p>
          <p><strong>Approved By</strong>: ${data.userName || 'N/A'}</p>
        `;
        break;
      default:
        subject = `Inventory notification: ${eventType}`;
        body = `<p>An automated notification event of type: <strong>${eventType}</strong> occurred.</p>`;
        break;
    }

    return { subject, body };
  }

  private formatTimestamp(isoString?: string): string {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'N/A';

      const formatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Riyadh',
      });
      const formatted = formatter.format(date);
      return formatted.replace(/\//g, '-').replace(',', '');
    } catch {
      return 'N/A';
    }
  }

  private async enrichPayload(
    eventType: string,
    payload: unknown,
  ): Promise<unknown> {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const data = payload as Record<string, unknown>;

    if (eventType === 'ISSUE_POSTED') {
      const whId = data.warehouseId as string | undefined;
      const userId = data.postedByUserId as string | undefined;

      let warehouseName = 'N/A';
      let postedByName = 'N/A';

      if (whId) {
        const wh = await this.prisma.warehouse.findUnique({
          where: { id: whId },
          select: { name: true },
        });
        if (wh) {
          warehouseName = wh.name;
        }
      }

      if (userId) {
        const u = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        if (u) {
          postedByName = u.name || u.email;
        }
      }

      const formattedDate = this.formatTimestamp(
        data.timestamp as string | undefined,
      );

      return {
        ...data,
        warehouseName,
        postedByName,
        formattedDate,
        warehouseId: warehouseName,
        postedByUserId: postedByName,
        timestamp: formattedDate,
      };
    }

    return payload;
  }

  private resolveTargetRoles(eventType: string): Role[] {
    switch (eventType) {
      case 'SECURITY_ALERT_REPLAY_ATTACK':
        return [Role.ADMIN];
      case 'ISSUE_POSTED':
        return [Role.ADMIN, Role.INV_MGR];
      case 'PR_SUBMITTED':
        return [Role.APPROVER, Role.PROC_MGR];
      case 'PO_SUBMITTED':
        return [Role.PROC_MGR, Role.APPROVER, Role.GM];
      case 'GRN_POSTED':
        return [Role.PROC_MGR, Role.APPROVER, Role.GM];
      case 'LOW_STOCK_ALERT':
        return [Role.INV_MGR, Role.PROC_MGR];
      case 'ADJUSTMENT_POSTED':
        return [Role.ADMIN, Role.GM, Role.INV_MGR];
      case 'STOCKTAKE_POSTED':
        return [Role.ADMIN, Role.GM];
      case 'PO_APPROVED':
        return [Role.PROC_MGR, Role.APPROVER, Role.GM];
      default:
        return [];
    }
  }

  private mapEventToDocType(eventType: string): DocumentType | null {
    if (eventType.startsWith('PR_')) return DocumentType.PURCHASE_REQUEST;
    if (eventType.startsWith('PO_')) return DocumentType.PURCHASE_ORDER;
    if (eventType.startsWith('GRN_')) return DocumentType.GOODS_RECEIVED_NOTE;
    if (eventType.startsWith('ISSUE_')) return DocumentType.INVENTORY_ISSUE;
    if (eventType.startsWith('TRANSFER_')) return DocumentType.TRANSFER;
    if (eventType.startsWith('ADJUSTMENT_')) return DocumentType.ADJUSTMENT;
    if (eventType.startsWith('KITCHEN_REQUEST_')) return DocumentType.KITCHEN_REQUEST;
    if (eventType.startsWith('STOCKTAKE_')) return DocumentType.STOCKTAKE;
    return null;
  }
}
