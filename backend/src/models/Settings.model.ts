import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  companyId: mongoose.Types.ObjectId;
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    favicon?: string;
  };
  business: {
    currency: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
    fiscalYearStart: number;
    taxRate: number;
    taxName: string;
    country: string;
  };
  analytics: {
    forecastAlgorithm: 'linear_regression' | 'moving_average' | 'exponential_smoothing';
    forecastHorizon: number;
    rfmWeights: {
      recency: number;
      frequency: number;
      monetary: number;
    };
    churnThresholdDays: number;
    lowInventoryThreshold: number;
  };
  notifications: {
    revenueDropThreshold: number;
    lowInventoryAlert: boolean;
    churnRiskAlert: boolean;
    weeklyDigest: boolean;
    monthlyReport: boolean;
    alertEmails: string[];
  };
  integrations: {
    webhookUrl?: string;
    webhookSecret?: string;
    webhookEvents: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    branding: {
      logo: String,
      primaryColor: { type: String, default: '#1976D2' },
      secondaryColor: { type: String, default: '#DC004E' },
      favicon: String,
    },
    business: {
      currency: { type: String, default: 'USD', uppercase: true },
      timezone: { type: String, default: 'UTC' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      numberFormat: { type: String, default: 'en-US' },
      fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      taxName: { type: String, default: 'Tax' },
      country: { type: String, default: 'US' },
    },
    analytics: {
      forecastAlgorithm: {
        type: String,
        enum: ['linear_regression', 'moving_average', 'exponential_smoothing'],
        default: 'exponential_smoothing',
      },
      forecastHorizon: { type: Number, default: 90 },
      rfmWeights: {
        recency: { type: Number, default: 0.4 },
        frequency: { type: Number, default: 0.3 },
        monetary: { type: Number, default: 0.3 },
      },
      churnThresholdDays: { type: Number, default: 90 },
      lowInventoryThreshold: { type: Number, default: 10 },
    },
    notifications: {
      revenueDropThreshold: { type: Number, default: 20 },
      lowInventoryAlert: { type: Boolean, default: true },
      churnRiskAlert: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      monthlyReport: { type: Boolean, default: true },
      alertEmails: [{ type: String, lowercase: true, trim: true }],
    },
    integrations: {
      webhookUrl: String,
      webhookSecret: String,
      webhookEvents: [{ type: String }],
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
