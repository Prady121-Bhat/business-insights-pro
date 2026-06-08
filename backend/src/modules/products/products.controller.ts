import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { productsService } from './products.service';
import { AppError } from '../../middleware/errorHandler.middleware';

function validate(req: Request) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
}

export class ProductsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      validate(req);
      const product = await productsService.createProduct(req.tenantId!, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (e) { next(e); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, category, velocityCategory, lowStock, outOfStock, search, sortBy, sortOrder } = req.query;
      const result = await productsService.getProducts(req.tenantId!, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        category: category as string,
        velocityCategory: velocityCategory as string,
        lowStock: lowStock === 'true',
        outOfStock: outOfStock === 'true',
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getProductById(req.tenantId!, req.params.id);
      res.json({ success: true, data: product });
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      validate(req);
      const product = await productsService.updateProduct(req.tenantId!, req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.deleteProduct(req.tenantId!, req.params.id);
      res.json({ success: true, message: 'Product deactivated' });
    } catch (e) { next(e); }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      validate(req);
      const { adjustment, reason } = req.body;
      const product = await productsService.adjustStock(req.tenantId!, req.params.id, Number(adjustment), reason);
      res.json({ success: true, data: product });
    } catch (e) { next(e); }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productsService.getCategories(req.tenantId!);
      res.json({ success: true, data: categories });
    } catch (e) { next(e); }
  }

  async getInventoryOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.getInventoryOverview(req.tenantId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getStockoutPredictions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.getStockoutPredictions(req.tenantId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getReorderRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.getReorderRecommendations(req.tenantId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getLowStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.getLowStockAlerts(req.tenantId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getDeadInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.getDeadInventory(req.tenantId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async computeMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.computeInventoryMetrics(req.tenantId!);
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }
}

export const productsController = new ProductsController();
