import { Model, Document, FilterQuery, UpdateQuery, QueryOptions, Types } from 'mongoose';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async findById(id: string | Types.ObjectId, select?: string): Promise<T | null> {
    return this.model.findById(id).select(select || '').exec();
  }

  async findOne(filter: FilterQuery<T>, select?: string): Promise<T | null> {
    return this.model.findOne(filter).select(select || '').exec();
  }

  async findMany(filter: FilterQuery<T>, options?: PaginationOptions & { select?: string }): Promise<T[]> {
    const { page = 1, limit = 50, sort = { createdAt: -1 }, select = '' } = options || {};
    const skip = (page - 1) * limit;
    return this.model.find(filter).select(select).sort(sort).skip(skip).limit(limit).exec();
  }

  async findPaginated(
    filter: FilterQuery<T>,
    options?: PaginationOptions & { select?: string; populate?: string | string[] }
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, sort = { createdAt: -1 }, select = '', populate } = options || {};
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .select(select)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(populate || [])
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const pages = Math.ceil(total / limit);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return doc.save();
  }

  async createMany(data: Partial<T>[]): Promise<T[]> {
    return this.model.insertMany(data as any) as unknown as T[];
  }

  async updateById(id: string | Types.ObjectId, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: true, ...options })
      .exec();
  }

  async updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model
      .findOneAndUpdate(filter, update, { new: true, runValidators: true, ...options })
      .exec();
  }

  async updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<number> {
    const result = await this.model.updateMany(filter, update).exec();
    return result.modifiedCount;
  }

  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: FilterQuery<T>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const doc = await this.model.exists(filter).exec();
    return doc !== null;
  }

  async aggregate<R = any>(pipeline: object[]): Promise<R[]> {
    return this.model.aggregate<R>(pipeline as any).exec();
  }
}
