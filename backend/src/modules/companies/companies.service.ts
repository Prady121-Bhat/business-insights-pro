import { Company, ICompany } from '../../models/Company.model';
import { Settings, ISettings } from '../../models/Settings.model';
import { Subscription } from '../../models/Subscription.model';
import { companyRepository } from '../../repositories/company.repository';
import { tenantService } from '../../services/tenant.service';
import { AppError } from '../../middleware/errorHandler.middleware';
import { logger } from '../../config/logger';

interface UpdateCompanyInput {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: Partial<ICompany['address']>;
}

interface UpdateSettingsInput {
  currency?: string;
  timezone?: string;
  taxRate?: number;
  fiscalYearStart?: number;
  theme?: 'light' | 'dark';
  dateFormat?: string;
  numberFormat?: string;
}

class CompaniesService {
  async getCompany(companyId: string) {
    const { company, subscription, settings } = await tenantService.getCompanyContext(companyId);
    return { company, subscription, settings };
  }

  async updateCompany(companyId: string, input: UpdateCompanyInput): Promise<ICompany> {
    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.email) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.website !== undefined) updateData.website = input.website;
    if (input.address) {
      for (const [k, v] of Object.entries(input.address)) {
        updateData[`address.${k}`] = v;
      }
    }

    const updated = await Company.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updated) throw new AppError('Company not found', 404);

    logger.info('Company updated', { companyId });
    return updated;
  }

  async updateSettings(companyId: string, input: UpdateSettingsInput): Promise<ICompany> {
    const updateData: any = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) updateData[`settings.${k}`] = v;
    }

    const updated = await Company.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updated) throw new AppError('Company not found', 404);

    await Settings.findOneAndUpdate(
      { companyId },
      { $set: { 'business.currency': input.currency, 'business.timezone': input.timezone, 'business.taxRate': input.taxRate } },
      { new: true }
    );

    logger.info('Company settings updated', { companyId });
    return updated;
  }

  async updateBranding(companyId: string, branding: Partial<ISettings['branding']>): Promise<ISettings> {
    const settings = await Settings.findOneAndUpdate(
      { companyId },
      { $set: { branding } },
      { new: true, runValidators: true }
    );
    if (!settings) throw new AppError('Settings not found', 404);

    logger.info('Company branding updated', { companyId });
    return settings;
  }

  async updateLogo(companyId: string, logoPath: string): Promise<void> {
    await Promise.all([
      Company.findByIdAndUpdate(companyId, { logo: logoPath }),
      Settings.findOneAndUpdate({ companyId }, { 'branding.logo': logoPath }),
    ]);
  }

  async getSubscription(companyId: string) {
    const sub = await Subscription.findOne({ companyId });
    if (!sub) throw new AppError('Subscription not found', 404);
    return sub;
  }

  async updateAnalyticsSettings(
    companyId: string,
    analyticsConfig: Partial<ISettings['analytics']>
  ): Promise<ISettings> {
    const updateData: any = {};
    for (const [k, v] of Object.entries(analyticsConfig)) {
      updateData[`analytics.${k}`] = v;
    }
    const settings = await Settings.findOneAndUpdate(
      { companyId },
      { $set: updateData },
      { new: true }
    );
    if (!settings) throw new AppError('Settings not found', 404);
    return settings;
  }

  async updateNotificationSettings(
    companyId: string,
    notifConfig: Partial<ISettings['notifications']>
  ): Promise<ISettings> {
    const updateData: any = {};
    for (const [k, v] of Object.entries(notifConfig)) {
      updateData[`notifications.${k}`] = v;
    }
    const settings = await Settings.findOneAndUpdate(
      { companyId },
      { $set: updateData },
      { new: true }
    );
    if (!settings) throw new AppError('Settings not found', 404);
    return settings;
  }

  async getAllCompanies(page: number, limit: number) {
    return companyRepository.findActive(page, limit);
  }
}

export const companiesService = new CompaniesService();
