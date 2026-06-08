import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  companyId: mongoose.Types.ObjectId;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused';
  billing: {
    cycle: 'monthly' | 'annual';
    amount: number;
    currency: string;
    nextBillingDate?: Date;
    lastBillingDate?: Date;
    paymentMethod?: string;
  };
  limits: {
    maxUsers: number;
    maxDataRows: number;
    maxReports: number;
    forecastHorizonDays: number;
    apiAccess: boolean;
    customBranding: boolean;
    scheduledReports: boolean;
    advancedAnalytics: boolean;
  };
  usage: {
    currentUsers: number;
    currentDataRows: number;
    currentReports: number;
    lastCalculated: Date;
  };
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['starter', 'professional', 'enterprise'],
      required: true,
      default: 'starter',
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'cancelled', 'paused'],
      default: 'trialing',
    },
    billing: {
      cycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      nextBillingDate: Date,
      lastBillingDate: Date,
      paymentMethod: String,
    },
    limits: {
      maxUsers: { type: Number, default: 5 },
      maxDataRows: { type: Number, default: 50000 },
      maxReports: { type: Number, default: 10 },
      forecastHorizonDays: { type: Number, default: 30 },
      apiAccess: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      scheduledReports: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
    },
    usage: {
      currentUsers: { type: Number, default: 0 },
      currentDataRows: { type: Number, default: 0 },
      currentReports: { type: Number, default: 0 },
      lastCalculated: { type: Date, default: Date.now },
    },
    trialEndsAt: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ 'billing.nextBillingDate': 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
