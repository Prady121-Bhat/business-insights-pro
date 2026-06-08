import { Types } from 'mongoose';
import { Notification, NotificationType, NotificationSeverity } from '../models/Notification.model';
import { Settings } from '../models/Settings.model';
import { emailService } from './email.service';
import { logger } from '../config/logger';

interface CreateNotificationInput {
  companyId: string;
  userId?: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  sendEmail?: boolean;
}

class NotificationService {
  async create(input: CreateNotificationInput): Promise<void> {
    try {
      const notification = await Notification.create({
        companyId: new Types.ObjectId(input.companyId),
        ...(input.userId ? { userId: new Types.ObjectId(input.userId) } : {}),
        type: input.type,
        severity: input.severity ?? 'info',
        title: input.title,
        message: input.message,
        data: input.data,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        isRead: false,
        isEmailSent: false,
      });

      if (input.sendEmail) {
        await this.sendEmailForNotification(input.companyId, notification._id.toString(), input.title, input.message, input.actionUrl);
      }
    } catch (err: any) {
      logger.error('Failed to create notification', { error: err.message, companyId: input.companyId });
    }
  }

  private async sendEmailForNotification(companyId: string, notificationId: string, title: string, message: string, actionUrl?: string): Promise<void> {
    try {
      const settings = await Settings.findOne({ companyId }).select('notifications').lean();
      const emails = settings?.notifications?.alertEmails ?? [];
      if (!emails.length) return;

      await emailService.sendAlert(emails, title, message, actionUrl);
      await Notification.findByIdAndUpdate(notificationId, { $set: { isEmailSent: true, emailSentAt: new Date() } });
    } catch (err: any) {
      logger.warn('Notification email failed', { notificationId, error: err.message });
    }
  }

  async createImportNotification(companyId: string, userId: string, status: 'complete' | 'failed', jobData: { fileName: string; entityType: string; result?: any; errorMessage?: string }): Promise<void> {
    const isSuccess = status === 'complete';
    await this.create({
      companyId,
      userId,
      type: isSuccess ? 'import_complete' : 'import_failed',
      severity: isSuccess ? 'success' : 'error',
      title: isSuccess ? `Import Completed — ${jobData.fileName}` : `Import Failed — ${jobData.fileName}`,
      message: isSuccess
        ? `Successfully imported ${(jobData.result?.created ?? 0) + (jobData.result?.updated ?? 0)} ${jobData.entityType} records.`
        : `Import failed: ${jobData.errorMessage ?? 'Unknown error'}`,
      actionUrl: '/imports',
      actionLabel: 'View Imports',
      data: { fileName: jobData.fileName, entityType: jobData.entityType, result: jobData.result },
      sendEmail: false,
    });

    if (isSuccess && jobData.result) {
      try {
        const settings = await Settings.findOne({ companyId }).select('notifications').lean();
        const emails = settings?.notifications?.alertEmails ?? [];
        if (emails.length) {
          await emailService.sendImportResult(emails[0], jobData.fileName, jobData.entityType, jobData.result);
        }
      } catch {}
    }
  }

  async createInsightNotification(companyId: string, type: NotificationType, severity: NotificationSeverity, title: string, message: string, actionUrl?: string): Promise<void> {
    try {
      const settings = await Settings.findOne({ companyId }).select('notifications').lean();

      // Check per-type opt-out
      if (type === 'low_inventory' && !settings?.notifications?.lowInventoryAlert) return;
      if (type === 'churn_risk' && !settings?.notifications?.churnRiskAlert) return;

      const sendEmail = !!(settings?.notifications?.alertEmails?.length);
      await this.create({ companyId, type, severity, title, message, actionUrl, sendEmail });
    } catch (err: any) {
      logger.error('createInsightNotification failed', { error: err.message });
    }
  }

  async markRead(ids: string[], companyId: string): Promise<void> {
    await Notification.updateMany(
      { _id: { $in: ids.map((id) => new Types.ObjectId(id)) }, companyId },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  async markAllRead(companyId: string, userId?: string): Promise<void> {
    const filter: any = { companyId, isRead: false };
    if (userId) filter.$or = [{ userId: new Types.ObjectId(userId) }, { userId: { $exists: false } }];
    await Notification.updateMany(filter, { $set: { isRead: true, readAt: new Date() } });
  }

  async getUnreadCount(companyId: string, userId?: string): Promise<number> {
    const filter: any = { companyId, isRead: false };
    if (userId) filter.$or = [{ userId: new Types.ObjectId(userId) }, { userId: { $exists: false } }];
    return Notification.countDocuments(filter);
  }

  async list(companyId: string, userId: string, options: { page?: number; limit?: number; type?: string; severity?: string; unreadOnly?: boolean }) {
    const { page = 1, limit = 30, type, severity, unreadOnly } = options;
    const filter: any = {
      companyId,
      $or: [{ userId: new Types.ObjectId(userId) }, { userId: { $exists: false } }],
    };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (unreadOnly) filter.isRead = false;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async deleteOne(id: string, companyId: string): Promise<void> {
    await Notification.deleteOne({ _id: id, companyId });
  }

  async deleteRead(companyId: string): Promise<void> {
    await Notification.deleteMany({ companyId, isRead: true });
  }
}

export const notificationService = new NotificationService();
