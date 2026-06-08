import { Company, ICompany } from '../models/Company.model';
import { BaseRepository } from './base.repository';

class CompanyRepository extends BaseRepository<ICompany> {
  constructor() {
    super(Company);
  }

  async findBySlug(slug: string): Promise<ICompany | null> {
    return Company.findOne({ slug, isActive: true }).exec();
  }

  async findActive(page = 1, limit = 20) {
    return this.findPaginated({ isActive: true }, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
  }

  async updateSettings(companyId: string, settings: Partial<ICompany['settings']>): Promise<ICompany | null> {
    const updateObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(settings)) {
      updateObj[`settings.${key}`] = val;
    }
    return Company.findByIdAndUpdate(companyId, { $set: updateObj }, { new: true, runValidators: true }).exec();
  }
}

export const companyRepository = new CompanyRepository();
