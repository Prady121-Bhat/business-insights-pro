import { Types } from 'mongoose';
import { Product } from '../../models/Product.model';
import { productRepository } from '../../repositories/product.repository';
import { inventoryService } from '../../services/inventory.service';
import { cacheService } from '../../services/cache.service';
import { AppError } from '../../middleware/errorHandler.middleware';

interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  category: string;
  brand?: string;
  unit?: string;
  tags?: string[];
  pricing: { costPrice: number; sellingPrice: number; taxRate?: number; discountable?: boolean };
  inventory: { currentStock: number; reorderPoint: number; reorderQuantity: number; maxStock?: number; warehouse?: string; location?: string };
}

interface ProductQueryOpts {
  page?: number;
  limit?: number;
  category?: string;
  velocityCategory?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductsService {
  async createProduct(companyId: string, data: CreateProductData) {
    const existing = await Product.findOne({ companyId, sku: data.sku });
    if (existing) throw new AppError('SKU already exists for this company', 409);

    const product = await productRepository.create({
      ...data,
      companyId: new Types.ObjectId(companyId),
      metrics: { velocityCategory: 'slow', totalSold: 0, totalRevenue: 0, averageMonthlySales: 0, daysOfInventory: 9999, turnoverRate: 0 },
    } as any);

    cacheService.invalidateTenant(companyId);
    return product;
  }

  async getProducts(companyId: string, opts: ProductQueryOpts) {
    return productRepository.findByCompany(companyId, opts);
  }

  async getProductById(companyId: string, productId: string) {
    const product = await Product.findOne({ _id: productId, companyId }).lean();
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async updateProduct(companyId: string, productId: string, updates: Partial<CreateProductData> & { isActive?: boolean }) {
    const product = await Product.findOne({ _id: productId, companyId });
    if (!product) throw new AppError('Product not found', 404);

    if (updates.pricing) {
      Object.assign(product.pricing, updates.pricing);
      delete updates.pricing;
    }
    if (updates.inventory) {
      Object.assign(product.inventory, updates.inventory);
      delete updates.inventory;
    }

    Object.assign(product, updates);
    await product.save();
    cacheService.invalidateTenant(companyId);
    return product;
  }

  async deleteProduct(companyId: string, productId: string) {
    const product = await Product.findOneAndUpdate(
      { _id: productId, companyId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!product) throw new AppError('Product not found', 404);
    cacheService.invalidateTenant(companyId);
    return product;
  }

  async adjustStock(companyId: string, productId: string, adjustment: number, reason?: string) {
    const product = await inventoryService.adjustStock(companyId, productId, adjustment, reason);
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async getCategories(companyId: string) {
    return productRepository.getCategories(companyId);
  }

  async getInventoryOverview(companyId: string) {
    return inventoryService.getInventoryOverview(companyId);
  }

  async getStockoutPredictions(companyId: string) {
    return inventoryService.getStockoutPredictions(companyId);
  }

  async getReorderRecommendations(companyId: string) {
    return inventoryService.getReorderRecommendations(companyId);
  }

  async getLowStockAlerts(companyId: string) {
    return inventoryService.getLowStockAlerts(companyId);
  }

  async getDeadInventory(companyId: string) {
    return inventoryService.getDeadInventory(companyId);
  }

  async computeInventoryMetrics(companyId: string) {
    await inventoryService.computeVelocity(companyId);
    return { message: 'Inventory metrics recalculated' };
  }
}

export const productsService = new ProductsService();
