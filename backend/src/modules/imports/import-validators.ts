// Field definitions for each entity type — describes expected columns, types, and rules

export type FieldType = 'string' | 'number' | 'date' | 'email' | 'boolean' | 'enum';

export interface FieldDef {
  key: string;          // internal field name
  label: string;        // human-readable label shown in mapping UI
  type: FieldType;
  required: boolean;
  enum?: string[];      // valid values for enum type
  min?: number;
  max?: number;
}

export const ENTITY_FIELDS: Record<string, FieldDef[]> = {
  customers: [
    { key: 'firstName', label: 'First Name', type: 'string', required: true },
    { key: 'lastName', label: 'Last Name', type: 'string', required: true },
    { key: 'email', label: 'Email', type: 'email', required: false },
    { key: 'phone', label: 'Phone', type: 'string', required: false },
    { key: 'company', label: 'Company', type: 'string', required: false },
    { key: 'segment', label: 'Segment', type: 'enum', required: false, enum: ['vip', 'loyal', 'regular', 'at_risk', 'lost', 'new'] },
    { key: 'city', label: 'City', type: 'string', required: false },
    { key: 'country', label: 'Country', type: 'string', required: false },
    { key: 'createdAt', label: 'Join Date', type: 'date', required: false },
    { key: 'notes', label: 'Notes', type: 'string', required: false },
  ],
  products: [
    { key: 'name', label: 'Product Name', type: 'string', required: true },
    { key: 'sku', label: 'SKU', type: 'string', required: true },
    { key: 'category', label: 'Category', type: 'string', required: true },
    { key: 'costPrice', label: 'Cost Price', type: 'number', required: true, min: 0 },
    { key: 'sellingPrice', label: 'Selling Price', type: 'number', required: true, min: 0 },
    { key: 'currentStock', label: 'Current Stock', type: 'number', required: false, min: 0 },
    { key: 'reorderPoint', label: 'Reorder Point', type: 'number', required: false, min: 0 },
    { key: 'reorderQuantity', label: 'Reorder Quantity', type: 'number', required: false, min: 1 },
    { key: 'brand', label: 'Brand', type: 'string', required: false },
    { key: 'description', label: 'Description', type: 'string', required: false },
    { key: 'taxRate', label: 'Tax Rate %', type: 'number', required: false, min: 0, max: 100 },
  ],
  expenses: [
    { key: 'title', label: 'Title / Description', type: 'string', required: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true, min: 0 },
    { key: 'category', label: 'Category', type: 'enum', required: true, enum: ['rent', 'utilities', 'salaries', 'marketing', 'inventory', 'equipment', 'software', 'insurance', 'maintenance', 'travel', 'office_supplies', 'professional_services', 'taxes', 'shipping', 'other'] },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'vendor', label: 'Vendor', type: 'string', required: false },
    { key: 'notes', label: 'Notes', type: 'string', required: false },
    { key: 'isRecurring', label: 'Recurring?', type: 'boolean', required: false },
  ],
  sales: [
    { key: 'saleDate', label: 'Sale Date', type: 'date', required: true },
    { key: 'customerEmail', label: 'Customer Email', type: 'email', required: false },
    { key: 'customerName', label: 'Customer Name', type: 'string', required: false },
    { key: 'productSku', label: 'Product SKU', type: 'string', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true, min: 1 },
    { key: 'unitPrice', label: 'Unit Price', type: 'number', required: true, min: 0 },
    { key: 'discount', label: 'Discount', type: 'number', required: false, min: 0 },
    { key: 'channel', label: 'Channel', type: 'enum', required: false, enum: ['online', 'in-store', 'phone', 'wholesale', 'marketplace', 'direct', 'other'] },
    { key: 'notes', label: 'Notes', type: 'string', required: false },
  ],
};

export interface ValidationError {
  row: number;
  column?: string;
  message: string;
}

export interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  preview: Record<string, any>[];  // first 5 valid rows
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  // Try common formats: DD/MM/YYYY, MM/DD/YYYY
  const parts = val.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const d2 = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function parseBool(val: string): boolean {
  return ['true', 'yes', '1', 'y'].includes(String(val).toLowerCase().trim());
}

export function validateRows(
  rows: Record<string, any>[],
  mapping: Record<string, string>, // csvColumn -> entityField
  entityType: string
): ValidationResult {
  const fields = ENTITY_FIELDS[entityType] ?? [];
  const fieldMap = new Map(fields.map((f) => [f.key, f]));

  // Invert mapping: entityField -> csvColumn
  const fieldToCsv = new Map<string, string>();
  for (const [csvCol, entityField] of Object.entries(mapping)) {
    if (entityField) fieldToCsv.set(entityField, csvCol);
  }

  const errors: ValidationError[] = [];
  const validIndices: number[] = [];
  const preview: Record<string, any>[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed, skip header
    const rowErrors: ValidationError[] = [];
    const parsed: Record<string, any> = {};

    for (const field of fields) {
      const csvCol = fieldToCsv.get(field.key);
      const rawVal = csvCol ? String(row[csvCol] ?? '').trim() : '';
      const isEmpty = rawVal === '' || rawVal === null || rawVal === undefined;

      if (field.required && isEmpty) {
        rowErrors.push({ row: rowNum, column: field.label, message: `${field.label} is required` });
        continue;
      }
      if (isEmpty) { parsed[field.key] = undefined; continue; }

      switch (field.type) {
        case 'number': {
          const n = parseFloat(rawVal.replace(/[,$]/g, ''));
          if (isNaN(n)) { rowErrors.push({ row: rowNum, column: field.label, message: `${field.label} must be a number (got "${rawVal}")` }); break; }
          if (field.min !== undefined && n < field.min) { rowErrors.push({ row: rowNum, column: field.label, message: `${field.label} must be ≥ ${field.min}` }); break; }
          if (field.max !== undefined && n > field.max) { rowErrors.push({ row: rowNum, column: field.label, message: `${field.label} must be ≤ ${field.max}` }); break; }
          parsed[field.key] = n;
          break;
        }
        case 'date': {
          const d = parseDate(rawVal);
          if (!d) { rowErrors.push({ row: rowNum, column: field.label, message: `${field.label}: invalid date "${rawVal}"` }); break; }
          parsed[field.key] = d;
          break;
        }
        case 'email': {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawVal)) {
            rowErrors.push({ row: rowNum, column: field.label, message: `${field.label}: invalid email "${rawVal}"` }); break;
          }
          parsed[field.key] = rawVal.toLowerCase();
          break;
        }
        case 'enum': {
          if (field.enum && !field.enum.includes(rawVal.toLowerCase())) {
            rowErrors.push({ row: rowNum, column: field.label, message: `${field.label}: "${rawVal}" not in [${field.enum.join(', ')}]` }); break;
          }
          parsed[field.key] = rawVal.toLowerCase();
          break;
        }
        case 'boolean':
          parsed[field.key] = parseBool(rawVal);
          break;
        default:
          parsed[field.key] = rawVal;
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validIndices.push(idx);
      if (preview.length < 5) preview.push(parsed);
    }
  });

  const invalidRows = rows.length - validIndices.length;
  return { totalRows: rows.length, validRows: validIndices.length, invalidRows, errors: errors.slice(0, 500), preview };
}
