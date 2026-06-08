import mongoose, { Document, Schema } from 'mongoose';

export type ImportStatus = 'uploaded' | 'mapping' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ImportEntityType = 'sales' | 'customers' | 'products' | 'expenses';

export interface IImportJob extends Document {
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  entityType: ImportEntityType;
  status: ImportStatus;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'xlsx' | 'xls';
  filePath: string;
  columnMapping: Record<string, string>;
  validation: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: Array<{
      row: number;
      column?: string;
      message: string;
    }>;
  };
  progress: {
    processed: number;
    total: number;
    percentage: number;
  };
  result: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>(
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
    entityType: {
      type: String,
      enum: ['sales', 'customers', 'products', 'expenses'],
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'mapping', 'validating', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'uploaded',
    },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, enum: ['csv', 'xlsx', 'xls'], required: true },
    filePath: { type: String, required: true },
    columnMapping: { type: Schema.Types.Mixed, default: {} },
    validation: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
      errors: [
        {
          row: Number,
          column: String,
          message: String,
          _id: false,
        },
      ],
    },
    progress: {
      processed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      percentage: { type: Number, default: 0, min: 0, max: 100 },
    },
    result: {
      created: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

ImportJobSchema.index({ companyId: 1, createdAt: -1 });
ImportJobSchema.index({ companyId: 1, status: 1 });
ImportJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const ImportJob = mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
