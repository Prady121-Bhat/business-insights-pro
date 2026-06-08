import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  companyId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  brand?: string;
  unit: string;
  pricing: {
    costPrice: number;
    sellingPrice: number;
    discountedPrice?: number;
    taxRate: number;
    margin: number;
  };
  inventory: {
    currentStock: number;
    reorderPoint: number;
    reorderQuantity: number;
    maxStock: number;
    warehouseLocation?: string;
    lastRestockedAt?: Date;
  };
  metrics: {
    totalSold: number;
    totalRevenue: number;
    averageMonthlySales: number;
    turnoverRate: number;
    daysOfInventory: number;
    lastSoldAt?: Date;
    velocityCategory: 'fast' | 'medium' | 'slow' | 'dead';
  };
  stockoutRisk: {
    score: number;
    predictedStockoutDate?: Date;
    lastCalculated?: Date;
  };
  images: string[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    description: { type: String, maxlength: 2000 },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    subCategory: { type: String, trim: true },
    brand: { type: String, trim: true },
    unit: { type: String, default: 'unit', trim: true },
    pricing: {
      costPrice: { type: Number, required: true, min: 0 },
      sellingPrice: { type: Number, required: true, min: 0 },
      discountedPrice: { type: Number, min: 0 },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      margin: { type: Number, default: 0 },
    },
    inventory: {
      currentStock: { type: Number, default: 0, min: 0 },
      reorderPoint: { type: Number, default: 10, min: 0 },
      reorderQuantity: { type: Number, default: 50, min: 0 },
      maxStock: { type: Number, default: 1000, min: 0 },
      warehouseLocation: { type: String, trim: true },
      lastRestockedAt: Date,
    },
    metrics: {
      totalSold: { type: Number, default: 0, min: 0 },
      totalRevenue: { type: Number, default: 0, min: 0 },
      averageMonthlySales: { type: Number, default: 0, min: 0 },
      turnoverRate: { type: Number, default: 0, min: 0 },
      daysOfInventory: { type: Number, default: 0, min: 0 },
      lastSoldAt: Date,
      velocityCategory: {
        type: String,
        enum: ['fast', 'medium', 'slow', 'dead'],
        default: 'medium',
      },
    },
    stockoutRisk: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      predictedStockoutDate: Date,
      lastCalculated: Date,
    },
    images: [{ type: String }],
    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProductSchema.index({ companyId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ companyId: 1, category: 1 });
ProductSchema.index({ companyId: 1, 'metrics.velocityCategory': 1 });
ProductSchema.index({ companyId: 1, 'inventory.currentStock': 1 });
ProductSchema.index({ companyId: 1, 'metrics.totalRevenue': -1 });
ProductSchema.index({ companyId: 1, isActive: 1 });

ProductSchema.pre('save', function (next) {
  if (this.pricing.costPrice > 0 && this.pricing.sellingPrice > 0) {
    this.pricing.margin =
      ((this.pricing.sellingPrice - this.pricing.costPrice) / this.pricing.sellingPrice) * 100;
  }
  next();
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
