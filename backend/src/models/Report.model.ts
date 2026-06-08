import mongoose, { Document, Schema } from 'mongoose';

export type ReportType = 'revenue' | 'sales' | 'customer' | 'inventory' | 'forecast' | 'expense' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface IReport extends Document {
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  parameters: {
    startDate?: Date;
    endDate?: Date;
    filters?: Record<string, any>;
    groupBy?: string;
    includeCharts?: boolean;
  };
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  downloadCount: number;
  errorMessage?: string;
  generationDuration?: number;
  expiresAt: Date;
  isScheduled: boolean;
  scheduleConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    recipients: string[];
    isActive: boolean;
    lastSentAt?: Date;
    nextSendAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['revenue', 'sales', 'customer', 'inventory', 'forecast', 'expense', 'custom'],
      required: true,
    },
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending',
    },
    parameters: {
      startDate: Date,
      endDate: Date,
      filters: { type: Schema.Types.Mixed },
      groupBy: String,
      includeCharts: { type: Boolean, default: true },
    },
    filePath: String,
    fileSize: Number,
    downloadUrl: String,
    downloadCount: { type: Number, default: 0 },
    errorMessage: String,
    generationDuration: Number,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
    isScheduled: { type: Boolean, default: false },
    scheduleConfig: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      dayOfWeek: { type: Number, min: 0, max: 6 },
      dayOfMonth: { type: Number, min: 1, max: 31 },
      time: String,
      recipients: [{ type: String, lowercase: true, trim: true }],
      isActive: { type: Boolean, default: true },
      lastSentAt: Date,
      nextSendAt: Date,
    },
  },
  { timestamps: true }
);

ReportSchema.index({ companyId: 1, type: 1, createdAt: -1 });
ReportSchema.index({ companyId: 1, status: 1 });
ReportSchema.index({ companyId: 1, isScheduled: 1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
