import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { Settings } from '../../models/Settings.model';
import { Company } from '../../models/Company.model';
import { AppError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';

const ALLOWED_SECTIONS = ['branding', 'business', 'analytics', 'notifications', 'integrations'];

export class SettingsController {
  // GET /settings — return merged settings + company profile
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const [settings, company] = await Promise.all([
        Settings.findOne({ companyId: req.tenantId }).lean(),
        Company.findById(req.tenantId).select('-__v').lean(),
      ]);

      if (!company) throw new AppError('Company not found', 404);

      // Upsert defaults if first load
      const effectiveSettings = settings ?? await Settings.create({ companyId: req.tenantId });

      res.json({ success: true, data: { settings: effectiveSettings, company } });
    } catch (e) { next(e); }
  }

  // PATCH /settings/:section — partial update of one section
  async updateSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { section } = req.params;
      if (!ALLOWED_SECTIONS.includes(section)) throw new AppError('Invalid settings section', 400);

      const update: Record<string, any> = {};
      for (const [k, v] of Object.entries(req.body)) {
        update[`${section}.${k}`] = v;
      }

      const settings = await Settings.findOneAndUpdate(
        { companyId: req.tenantId },
        { $set: update },
        { upsert: true, new: true, runValidators: true },
      ).lean();

      cacheService.invalidateTenant(req.tenantId!);
      res.json({ success: true, data: settings });
    } catch (e) { next(e); }
  }

  // PATCH /settings/company — update company profile fields
  async updateCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const allowed = ['name', 'email', 'phone', 'website', 'address'];
      const update: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[key] = req.body[key];
      }

      const company = await Company.findByIdAndUpdate(
        req.tenantId,
        { $set: update },
        { new: true, runValidators: true },
      ).lean();

      if (!company) throw new AppError('Company not found', 404);

      res.json({ success: true, data: company });
    } catch (e) { next(e); }
  }

  // POST /settings/logo — upload logo
  async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const logoUrl = `/uploads/logos/${req.file.filename}`;

      // Delete old logo file if exists
      const existing = await Settings.findOne({ companyId: req.tenantId }).select('branding.logo').lean();
      if (existing?.branding?.logo) {
        const oldPath = path.join(process.cwd(), existing.branding.logo.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
      }

      const [settings] = await Promise.all([
        Settings.findOneAndUpdate(
          { companyId: req.tenantId },
          { $set: { 'branding.logo': logoUrl } },
          { upsert: true, new: true },
        ).lean(),
        Company.findByIdAndUpdate(req.tenantId, { $set: { logo: logoUrl } }),
      ]);

      cacheService.invalidateTenant(req.tenantId!);
      res.json({ success: true, data: { logoUrl } });
    } catch (e) { next(e); }
  }

  // DELETE /settings/logo
  async deleteLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await Settings.findOne({ companyId: req.tenantId }).select('branding.logo').lean();
      if (existing?.branding?.logo) {
        const filePath = path.join(process.cwd(), existing.branding.logo.replace(/^\//, ''));
        if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
      }

      await Promise.all([
        Settings.findOneAndUpdate({ companyId: req.tenantId }, { $unset: { 'branding.logo': 1 } }),
        Company.findByIdAndUpdate(req.tenantId, { $unset: { logo: 1 } }),
      ]);

      cacheService.invalidateTenant(req.tenantId!);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  // GET /settings/export — export all settings as JSON
  async exportSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const [settings, company] = await Promise.all([
        Settings.findOne({ companyId: req.tenantId }).lean(),
        Company.findById(req.tenantId).select('name email phone website address').lean(),
      ]);
      res.setHeader('Content-Disposition', 'attachment; filename="settings-export.json"');
      res.json({ company, settings, exportedAt: new Date().toISOString() });
    } catch (e) { next(e); }
  }
}

export const settingsController = new SettingsController();
