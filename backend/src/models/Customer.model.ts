import mongoose, { Document, Schema } from 'mongoose';

export type CustomerSegment = 'vip' | 'loyal' | 'regular' | 'at_risk' | 'lost' | 'new';

export interface ICustomer extends Document {
  companyId: mongoose.Types.ObjectId;
  customerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  segment: CustomerSegment;
  tags: string[];
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    firstPurchaseDate?: Date;
    lastPurchaseDate?: Date;
    daysSinceLastPurchase?: number;
    lifetimeValue: number;
    rfmScore?: {
      recency: number;
      frequency: number;
      monetary: number;
      total: number;
    };
  };
  churnRisk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    predictedChurnDate?: Date;
    lastCalculated?: Date;
  };
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    segment: {
      type: String,
      enum: ['vip', 'loyal', 'regular', 'at_risk', 'lost', 'new'],
      default: 'new',
    },
    tags: [{ type: String, trim: true }],
    metrics: {
      totalOrders: { type: Number, default: 0, min: 0 },
      totalRevenue: { type: Number, default: 0, min: 0 },
      averageOrderValue: { type: Number, default: 0, min: 0 },
      firstPurchaseDate: Date,
      lastPurchaseDate: Date,
      daysSinceLastPurchase: Number,
      lifetimeValue: { type: Number, default: 0, min: 0 },
      rfmScore: {
        recency: { type: Number, min: 1, max: 5 },
        frequency: { type: Number, min: 1, max: 5 },
        monetary: { type: Number, min: 1, max: 5 },
        total: { type: Number, min: 3, max: 15 },
      },
    },
    churnRisk: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      level: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      predictedChurnDate: Date,
      lastCalculated: Date,
    },
    notes: { type: String, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CustomerSchema.index({ companyId: 1, email: 1 });
CustomerSchema.index({ companyId: 1, customerId: 1 }, { unique: true });
CustomerSchema.index({ companyId: 1, segment: 1 });
CustomerSchema.index({ companyId: 1, 'metrics.lastPurchaseDate': -1 });
CustomerSchema.index({ companyId: 1, 'churnRisk.level': 1 });
CustomerSchema.index({ companyId: 1, 'metrics.totalRevenue': -1 });

CustomerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
