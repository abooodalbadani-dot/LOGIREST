import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { EmailService } from '../../outbox/email.service';
import { Role, DocumentType } from '@prisma/client';

export interface PrSubmittedEvent {
  prId: string;
  branchId: string;
  creatorId: string;
  totalValue?: number;
  requestNumber?: string;
}

@Injectable()
export class PrNotificationListener {
  private readonly logger = new Logger(PrNotificationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('pr.submitted', { async: true })
  async handlePrSubmitted(payload: PrSubmittedEvent) {
    this.logger.log(
      `[PrNotificationListener] Asynchronously processing 'pr.submitted' event for PR ID: ${payload.prId} (Branch: ${payload.branchId})`,
    );

    // Step 3 - Query 1 (Actionable Approvers): Fetch users with roles ['BRANCH_MGR', 'PROC_MGR', 'APPROVER']
    // Constraint: Filter BRANCH_MGR strictly by user.branchScopes matching payload.branchId
    // Action: Send BOTH Email AND In-App Push notifications to these users.
    try {
      const approvers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: Role.PROC_MGR },
            { role: Role.APPROVER },
            {
              role: Role.BRANCH_MGR,
              branchScopes: {
                some: {
                  branchId: payload.branchId,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      const message = `طلب شراء جديد بانتظار الموافقة: ${payload.requestNumber || payload.prId}`;

      for (const approver of approvers) {
        // In-App Push
        try {
          await this.notificationService.createNotification({
            targetRole: approver.role,
            message,
            documentType: DocumentType.PURCHASE_REQUEST,
            documentId: payload.prId,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed in-app push for approver ${approver.id} (${approver.role}): ${errMsg}`,
          );
        }

        // Email Notification via injected EmailService
        if (approver.email) {
          try {
            const subject = `طلب شراء جديد بانتظار الموافقة: ${payload.requestNumber || payload.prId}`;
            const htmlContent = `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>طلب شراء جديد بحاجة لموافقتك</h2>
                <p>عزيزي <strong>${approver.name || approver.role}</strong>،</p>
                <p>تم إرسال طلب شراء جديد برقم <strong>${payload.requestNumber || payload.prId}</strong> وهو بانتظار موافقتك.</p>
                ${payload.totalValue ? `<p>إجمالي الأسطر/الكميات: <strong>${payload.totalValue}</strong></p>` : ''}
                <p>يرجى مراجعة الطلب واتخاذ الإجراء المناسب في النظام.</p>
              </div>
            `;
            const result = await this.emailService.sendEmail(
              approver.email,
              subject,
              htmlContent,
              'PR_SUBMITTED_APPROVER',
              {
                requestNumber: payload.requestNumber || payload.prId,
                prId: payload.prId,
                userName: approver.name,
                role: approver.role,
              },
            );
            if (!result.ok) {
              this.logger.warn(
                `Email dispatch for ${approver.email} returned: ${result.reason}`,
              );
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Failed email notification for approver ${approver.email}: ${errMsg}`,
            );
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error executing Query 1 (Approvers) for PR ${payload.prId}: ${errMsg}`);
    }

    // Step 3 - Query 2 (Informational Only): Fetch users with role ['PROC_OFFICER']
    // Action: Send In-App Push ONLY (NO Email).
    try {
      const procOfficers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: Role.PROC_OFFICER,
        },
        select: {
          id: true,
          role: true,
        },
      });

      const infoMessage = `تم تقديم طلب شراء جديد: ${payload.requestNumber || payload.prId}`;

      for (const officer of procOfficers) {
        try {
          await this.notificationService.createNotification({
            targetRole: officer.role,
            message: infoMessage,
            documentType: DocumentType.PURCHASE_REQUEST,
            documentId: payload.prId,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed in-app push for PROC_OFFICER ${officer.id}: ${errMsg}`,
          );
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error executing Query 2 (PROC_OFFICER) for PR ${payload.prId}: ${errMsg}`);
    }

    // Step 3 - Query 3 (Status Update): Fetch the original creatorId
    // Action: Send Email + In-App Push confirming submission.
    try {
      if (payload.creatorId) {
        const creator = await this.prisma.user.findUnique({
          where: { id: payload.creatorId },
          select: { id: true, email: true, name: true, role: true },
        });

        if (creator) {
          // In-App Push to creator
          try {
            await this.notificationService.createNotification({
              targetRole: creator.role,
              message: `تم تقديم طلب الشراء الخاص بك بنجاح: ${payload.requestNumber || payload.prId}`,
              documentType: DocumentType.PURCHASE_REQUEST,
              documentId: payload.prId,
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Failed in-app push for creator ${creator.id}: ${errMsg}`,
            );
          }

          // Email to creator via injected EmailService
          if (creator.email) {
            try {
              const subject = `تم تقديم طلب الشراء الخاص بك بنجاح: ${payload.requestNumber || payload.prId}`;
              const htmlContent = `
                <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2>تأكيد إرسال طلب الشراء</h2>
                  <p>عزيزي <strong>${creator.name}</strong>،</p>
                  <p>تم إرسال طلب الشراء الخاص بك برقم <strong>${payload.requestNumber || payload.prId}</strong> بنجاح، وهو الآن قيد المراجعة والموافقة.</p>
                </div>
              `;
              const result = await this.emailService.sendEmail(
                creator.email,
                subject,
                htmlContent,
                'PR_SUBMITTED_CREATOR',
                {
                  requestNumber: payload.requestNumber || payload.prId,
                  prId: payload.prId,
                  userName: creator.name,
                },
              );
              if (!result.ok) {
                this.logger.warn(
                  `Email dispatch for creator ${creator.email} returned: ${result.reason}`,
                );
              }
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              this.logger.error(
                `Failed confirmation email for creator ${creator.email}: ${errMsg}`,
              );
            }
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error executing Query 3 (Creator Status Update) for PR ${payload.prId}: ${errMsg}`);
    }
  }
}
