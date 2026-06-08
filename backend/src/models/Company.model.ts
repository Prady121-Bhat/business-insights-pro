import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  settings: {
    currency: string;
    timezone: string;
    taxRate: number;
    fiscalYearStart: number;
    theme: 'light' | 'dark';
    dateFormat: string;
    numberFormat: string;
  };
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'trialing' | 'past_due' | 'cancelled';
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
    maxUsers: number;
    maxDataRows: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    settings: {
      currency: { type: String, default: 'USD', uppercase: true, maxlength: 3 },
      timezone: { type: String, default: 'UTC' },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      numberFormat: { type: String, default: 'en-US' },
    },
    subscription: {
      plan: { type: String, enum: ['starter', 'professional', 'enterprise'], default: 'starter' },
      status: { type: String, enum: ['active', 'trialing', 'past_due', 'cancelled'], default: 'trialing' },
      trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      currentPeriodEnd: Date,
      maxUsers: { type: Number, default: 5 },
      maxDataRows: { type: Number, default: 50000 },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CompanySchema.index({ slug: 1 }, { unique: true });
CompanySchema.index({ email: 1 }, { unique: true });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ 'subscription.status': 1 });

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
