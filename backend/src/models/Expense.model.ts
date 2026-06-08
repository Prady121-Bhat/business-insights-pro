import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory =
  | 'salaries'
  | 'rent'
  | 'utilities'
  | 'marketing'
  | 'inventory'
  | 'equipment'
  | 'software'
  | 'travel'
  | 'insurance'
  | 'taxes'
  | 'maintenance'
  | 'office_supplies'
  | 'professional_services'
  | 'shipping'
  | 'other';

export interface IExpense extends Document {
  companyId: mongoose.Types.ObjectId;
  expenseNumber: string;
  title: string;
  description?: string;
  category: ExpenseCategory;
  subCategory?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  expenseDate: Date;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';
  paymentStatus: 'pending' | 'paid' | 'rejected';
  vendor?: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  tags: string[];
  approvedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    expenseNumber: { type: String, required: true, trim: true },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, maxlength: 1000 },
    category: {
      type: String,
      enum: [
        'salaries', 'rent', 'utilities', 'marketing', 'inventory', 'equipment',
        'software', 'travel', 'insurance', 'taxes', 'maintenance', 'office_supplies',
        'professional_services', 'shipping', 'other',
      ],
      required: true,
    },
    subCategory: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true, maxlength: 3 },
    expenseDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'cheque', 'other'],
      default: 'bank_transfer',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'rejected'],
      default: 'paid',
    },
    vendor: { type: String, trim: true },
    receiptUrl: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    },
    tags: [{ type: String, trim: true }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ companyId: 1, expenseNumber: 1 }, { unique: true });
ExpenseSchema.index({ companyId: 1, expenseDate: -1 });
ExpenseSchema.index({ companyId: 1, category: 1 });
ExpenseSchema.index({ companyId: 1, paymentStatus: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
