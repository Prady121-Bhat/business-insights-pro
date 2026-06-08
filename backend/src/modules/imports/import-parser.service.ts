import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export async function parseFile(filePath: string, fileType: string): Promise<ParsedFile> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    return parseCsv(filePath);
  } else {
    return parseExcel(filePath);
  }
}

function parseCsv(filePath: string): ParsedFile {
  const content = fs.readFileSync(filePath, 'utf8');
  // Strip BOM
  const cleaned = content.replace(/^﻿/, '');

  const records = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, rows: records, totalRows: records.length };
}

async function parseExcel(filePath: string): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [], totalRows: 0 };

  const headers: string[] = [];
  const rows: Record<string, any>[] = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      row.eachCell((cell) => {
        headers.push(String(cell.value ?? '').trim());
      });
    } else {
      const obj: Record<string, any> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const header = headers[colNum - 1];
        if (header) {
          let val = cell.value;
          if (val instanceof Date) val = val.toISOString().split('T')[0];
          else if (typeof val === 'object' && val !== null && 'result' in (val as any)) val = (val as any).result;
          else if (typeof val === 'object' && val !== null && 'text' in (val as any)) val = (val as any).text;
          obj[header] = val !== null && val !== undefined ? String(val).trim() : '';
        }
      });
      if (Object.values(obj).some((v) => v !== '')) {
        rows.push(obj);
      }
    }
  });

  return { headers, rows, totalRows: rows.length };
}
