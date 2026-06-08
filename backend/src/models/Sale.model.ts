import mongoose, { Document, Schema } from 'mongoose';

export type SaleStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online' | 'cheque' | 'other';

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  profit: number;
}

export interface ISale extends Document {
  companyId: mongoose.Types.ObjectId;
  saleNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  items: ISaleItem[];
  summary: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    shippingCost: number;
    grandTotal: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  };
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentDate?: Date;
  saleDate: Date;
  deliveryDate?: Date;
  notes?: string;
  tags: string[];
  channel: 'online' | 'in_store' | 'phone' | 'wholesale' | 'other';
  region?: string;
  salesRepId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    profit: { type: Number, default: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    saleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: { type: String, trim: true },
    items: {
      type: [SaleItemSchema],
      required: true,
      validate: {
        validator: (items: ISaleItem[]) => items.length > 0,
        message: 'Sale must have at least one item',
      },
    },
    summary: {
      subtotal: { type: Number, required: true, min: 0 },
      totalDiscount: { type: Number, default: 0, min: 0 },
      totalTax: { type: Number, default: 0, min: 0 },
      shippingCost: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
      totalCost: { type: Number, default: 0, min: 0 },
      grossProfit: { type: Number, default: 0 },
      profitMargin: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'refunded'],
      default: 'paid',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'online', 'cheque', 'other'],
      default: 'cash',
    },
    paymentDate: Date,
    saleDate: { type: Date, required: true, default: Date.now },
    deliveryDate: Date,
    notes: { type: String, maxlength: 1000 },
    tags: [{ type: String, trim: true }],
    channel: {
      type: String,
      enum: ['online', 'in_store', 'phone', 'wholesale', 'other'],
      default: 'in_store',
    },
    region: { type: String, trim: true },
    salesRepId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SaleSchema.index({ companyId: 1, saleNumber: 1 }, { unique: true });
SaleSchema.index({ companyId: 1, saleDate: -1 });
SaleSchema.index({ companyId: 1, customerId: 1 });
SaleSchema.index({ companyId: 1, status: 1 });
SaleSchema.index({ companyId: 1, paymentStatus: 1 });
SaleSchema.index({ companyId: 1, channel: 1 });
SaleSchema.index({ companyId: 1, saleDate: -1, status: 1 });

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);
