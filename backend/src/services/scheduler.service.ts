import cron from 'node-cron';
import { Company } from '../models/Company.model';
import { Settings } from '../models/Settings.model';
import { insightsService } from './insights.service';
import { notificationService } from './notification.service';
import { emailService } from './email.service';
import { logger } from '../config/logger';

class SchedulerService {
  private jobs: cron.ScheduledTask[] = [];

  start(): void {
    // Daily insight scan — 8 AM UTC
    this.jobs.push(
      cron.schedule('0 8 * * *', () => this.runDailyInsightScan(), { timezone: 'UTC' }),
    );

    // Weekly digest — Monday 9 AM UTC
    this.jobs.push(
      cron.schedule('0 9 * * 1', () => this.runWeeklyDigest(), { timezone: 'UTC' }),
    );

    logger.info('Scheduler started (daily insight scan @ 08:00 UTC, weekly digest @ Monday 09:00 UTC)');
  }

  stop(): void {
    this.jobs.forEach((j) => j.stop());
    this.jobs = [];
  }

  private async runDailyInsightScan(): Promise<void> {
    logger.info('Scheduler: daily insight scan starting');
    try {
      const companies = await Company.find({ isActive: true }).select('_id name').lean();
      for (const company of companies) {
        await this.scanCompany(String(company._id), company.name);
      }
    } catch (err: any) {
      logger.error('Scheduler: daily insight scan failed', { error: err.message });
    }
  }

  private async scanCompany(companyId: string, companyName: string): Promise<void> {
    try {
      const insights = await insightsService.generateInsights(companyId);
      const settings = await Settings.findOne({ companyId }).select('notifications').lean();

      for (const insight of insights) {
        if (insight.severity === 'error' || insight.severity === 'warning') {
          const notifType = mapInsightType(insight.type);
          if (!notifType) continue;

          await notificationService.createInsightNotification(
            companyId,
            notifType,
            insight.severity,
            insight.title,
            insight.message,
            insight.actionUrl,
          );
        }
      }

      logger.debug('Scheduler: insight scan complete', { companyId, insights: insights.length });
    } catch (err: any) {
      logger.warn('Scheduler: scan failed for company', { companyId, error: err.message });
    }
  }

  private async runWeeklyDigest(): Promise<void> {
    logger.info('Scheduler: weekly digest starting');
    try {
      const companies = await Company.find({ isActive: true }).select('_id name').lean();

      for (const company of companies) {
        const companyId = String(company._id);
        try {
          const settings = await Settings.findOne({ companyId }).select('notifications').lean();
          if (!settings?.notifications?.weeklyDigest) continue;
          const emails = settings.notifications.alertEmails ?? [];
          if (!emails.length) continue;

          const insights = await insightsService.generateInsights(companyId);
          await emailService.sendWeeklyDigest(emails, company.name, insights.slice(0, 10));
          logger.debug('Scheduler: weekly digest sent', { companyId, recipients: emails.length });
        } catch (err: any) {
          logger.warn('Scheduler: weekly digest failed for company', { companyId, error: err.message });
        }
      }
    } catch (err: any) {
      logger.error('Scheduler: weekly digest run failed', { error: err.message });
    }
  }
}

function mapInsightType(insightType: string): import('../models/Notification.model').NotificationType | null {
  const map: Record<string, import('../models/Notification.model').NotificationType> = {
    low_stock: 'low_inventory',
    stockout_risk: 'stockout',
    churn_risk: 'churn_risk',
    revenue_drop: 'revenue_drop',
    vip_churn_risk: 'churn_risk',
    fast_mover_stock_risk: 'low_inventory',
  };
  return map[insightType] ?? null;
}

export const schedulerService = new SchedulerService();
