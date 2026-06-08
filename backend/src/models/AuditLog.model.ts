import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'login_failed'
  | 'password_change' | 'password_reset'
  | 'export' | 'import'
  | 'role_change' | 'permission_change'
  | 'subscription_change';

export interface IAuditLog extends Document {
  companyId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: { type: String },
    userRole: { type: String },
    action: {
      type: String,
      enum: [
        'create', 'read', 'update', 'delete',
        'login', 'logout', 'login_failed',
        'password_change', 'password_reset',
        'export', 'import',
        'role_change', 'permission_change',
        'subscription_change',
      ],
      required: true,
    },
    resource: { type: String, required: true },
    resourceId: { type: String },
    description: { type: String, required: true },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    statusCode: { type: Number },
    success: { type: Boolean, default: true },
    errorMessage: { type: String },
    duration: { type: Number },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, userId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, action: 1 });
AuditLogSchema.index({ companyId: 1, resource: 1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
