import mongoose, { Document, Schema } from 'mongoose';

export type ForecastType = 'revenue' | 'sales' | 'demand' | 'customer_growth' | 'expense';
export type ForecastAlgorithm = 'linear_regression' | 'moving_average' | 'exponential_smoothing';
export type ForecastHorizon = 30 | 60 | 90 | 180 | 365;

export interface IForecastDataPoint {
  date: Date;
  predicted: number;
  lower: number;
  upper: number;
  actual?: number;
}

export interface IForecast extends Document {
  companyId: mongoose.Types.ObjectId;
  type: ForecastType;
  entityId?: mongoose.Types.ObjectId;
  entityName?: string;
  algorithm: ForecastAlgorithm;
  horizon: number;
  accuracy?: {
    mae: number;
    rmse: number;
    mape: number;
    r2: number;
  };
  dataPoints: IForecastDataPoint[];
  summary: {
    currentValue: number;
    predictedValue: number;
    growthRate: number;
    trend: 'up' | 'down' | 'stable';
    confidence: number;
  };
  metadata: {
    trainingDataPoints: number;
    trainingStartDate: Date;
    trainingEndDate: Date;
    generationDuration: number;
  };
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ForecastDataPointSchema = new Schema<IForecastDataPoint>(
  {
    date: { type: Date, required: true },
    predicted: { type: Number, required: true },
    lower: { type: Number, required: true },
    upper: { type: Number, required: true },
    actual: { type: Number },
  },
  { _id: false }
);

const ForecastSchema = new Schema<IForecast>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['revenue', 'sales', 'demand', 'customer_growth', 'expense'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    entityName: { type: String },
    algorithm: {
      type: String,
      enum: ['linear_regression', 'moving_average', 'exponential_smoothing'],
      required: true,
    },
    horizon: { type: Number, required: true, min: 1 },
    accuracy: {
      mae: Number,
      rmse: Number,
      mape: Number,
      r2: Number,
    },
    dataPoints: { type: [ForecastDataPointSchema], default: [] },
    summary: {
      currentValue: { type: Number, default: 0 },
      predictedValue: { type: Number, default: 0 },
      growthRate: { type: Number, default: 0 },
      trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
      confidence: { type: Number, default: 0, min: 0, max: 100 },
    },
    metadata: {
      trainingDataPoints: Number,
      trainingStartDate: Date,
      trainingEndDate: Date,
      generationDuration: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: String,
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

ForecastSchema.index({ companyId: 1, type: 1, status: 1 });
ForecastSchema.index({ companyId: 1, type: 1, entityId: 1 });
ForecastSchema.index({ companyId: 1, createdAt: -1 });

export const Forecast = mongoose.model<IForecast>('Forecast', ForecastSchema);
