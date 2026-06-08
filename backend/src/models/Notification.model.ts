import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'revenue_drop'
  | 'revenue_spike'
  | 'low_inventory'
  | 'stockout'
  | 'churn_risk'
  | 'new_customer'
  | 'forecast_ready'
  | 'report_ready'
  | 'import_complete'
  | 'import_failed'
  | 'system_alert'
  | 'subscription_expiring'
  | 'payment_failed';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface INotification extends Document {
  companyId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  readAt?: Date;
  isEmailSent: boolean;
  emailSentAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'revenue_drop', 'revenue_spike', 'low_inventory', 'stockout',
        'churn_risk', 'new_customer', 'forecast_ready', 'report_ready',
        'import_complete', 'import_failed', 'system_alert',
        'subscription_expiring', 'payment_failed',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info',
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    data: { type: Schema.Types.Mixed },
    actionUrl: { type: String },
    actionLabel: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    isEmailSent: { type: Boolean, default: false },
    emailSentAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ companyId: 1, userId: 1, isRead: 1 });
NotificationSchema.index({ companyId: 1, createdAt: -1 });
NotificationSchema.index({ companyId: 1, type: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
