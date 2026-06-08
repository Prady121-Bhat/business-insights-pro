import { IUser } from '../models/User.model';
import { ICompany } from '../models/Company.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        companyId?: string;
        role: string;
        email: string;
      };
      company?: ICompany;
      tenantId?: string;
    }
  }
}

export {};
