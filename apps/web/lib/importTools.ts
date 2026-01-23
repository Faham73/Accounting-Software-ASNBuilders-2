import { prisma } from '@accounting/db';
import { VoucherType } from '@accounting/db';
import { Decimal } from '@prisma/client/runtime/library';

export interface ColumnMapping {
  [columnName: string]: string | null; // Maps CSV column to target field, or null to skip
}

export interface ImportOptions {
  voucherKeyColumn?: string | null;
  dateColumn: string;
  accountColumn: string;
  debitColumn: string;
  creditColumn: string;
  typeColumn?: string | null;
  referenceNoColumn?: string | null;
  narrationColumn?: string | null;
  lineMemoColumn?: string | null;
  vendorColumn?: string | null;
  constantType?: VoucherType | null;
  constantReferenceNo?: string | null;
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface VoucherGroup {
  key: string;
  header: {
    date: Date;
    type?: VoucherType;
    referenceNo?: string;
    narration?: string;
    vendor?: string;
  };
  lines: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
  totals: {
    debit: number;
    credit: number;
    difference: number;
  };
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  vouchers: VoucherGroup[];
  totalRows: number;
  totalVouchers: number;
  errors: Array<{ voucherKey: string; message: string }>;
  warnings: Array<{ voucherKey: string; message: string }>;
  unresolvedAccounts: Array<{ accountCode?: string; accountName?: string; rowIndex: number }>;
}

/**
 * Parse CSV/XLSX data into rows
 */
export function parseFileData(data: any[], headers: string[]): ParsedRow[] {
  return data.map((row) => {
    const parsed: ParsedRow = {};
    headers.forEach((header, index) => {
      parsed[header] = row[index] ?? null;
    });
    return parsed;
  });
}

/**
 * Group rows into vouchers based on voucher key
 */
export function groupRowsIntoVouchers(
  rows: ParsedRow[],
  options: ImportOptions
): Map<string, ParsedRow[]> {
  const groups = new Map<string, ParsedRow[]>();

  for (const row of rows) {
    let key: string;

    if (options.voucherKeyColumn && row[options.voucherKeyColumn]) {
      // Use voucher key column
      key = String(row[options.voucherKeyColumn]);
    } else if (options.referenceNoColumn && row[options.referenceNoColumn] && row[options.dateColumn]) {
      // Group by date + referenceNo
      key = `${row[options.dateColumn]}_${row[options.referenceNoColumn]}`;
    } else {
      // Each row is its own voucher
      key = `row_${rows.indexOf(row)}`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  return groups;
}

/**
 * Parse date from various formats
 */
export function parseDate(value: string | number | null | undefined): Date | null {
  if (!value) return null;

  const str = String(value).trim();
  if (!str) return null;

  // Try ISO format first
  const isoDate = new Date(str);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try common formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = str.match(format);
    if (match) {
      let day: number, month: number, year: number;
      if (format === formats[2]) {
        // YYYY-MM-DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10) - 1;
        day = parseInt(match[3], 10);
      } else {
        // DD/MM/YYYY or DD-MM-YYYY
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10) - 1;
        year = parseInt(match[3], 10);
      }
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Parse number from string
 */
export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const str = String(value).trim().replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Resolve account by code or name
 */
export async function resolveAccount(
  companyId: string,
  accountCode?: string | null,
  accountName?: string | null
): Promise<{ id: string; code: string; name: string } | null> {
  if (!accountCode && !accountName) return null;

  // Try by code first
  if (accountCode) {
    const byCode = await prisma.account.findFirst({
      where: {
        companyId,
        code: accountCode,
        isActive: true,
      },
      select: { id: true, code: true, name: true },
    });
    if (byCode) return byCode;
  }

  // Try by exact name
  if (accountName) {
    const byExactName = await prisma.account.findFirst({
      where: {
        companyId,
        name: accountName,
        isActive: true,
      },
      select: { id: true, code: true, name: true },
    });
    if (byExactName) return byExactName;

    // Try case-insensitive
    const byName = await prisma.account.findFirst({
      where: {
        companyId,
        name: { equals: accountName, mode: 'insensitive' },
        isActive: true,
      },
      select: { id: true, code: true, name: true },
    });
    if (byName) return byName;
  }

  return null;
}

/**
 * Parse and validate vouchers from rows
 */
export async function parseAndValidateVouchers(
  rows: ParsedRow[],
  options: ImportOptions,
  companyId: string
): Promise<ValidationResult> {
  const groups = groupRowsIntoVouchers(rows, options);
  const vouchers: VoucherGroup[] = [];
  const errors: Array<{ voucherKey: string; message: string }> = [];
  const warnings: Array<{ voucherKey: string; message: string }> = [];
  const unresolvedAccounts: Array<{ accountCode?: string; accountName?: string; rowIndex: number }> = [];

  // Get all unique account codes/names for batch resolution
  const accountLookups = new Map<string, { accountCode?: string; accountName?: string }>();
  for (const row of rows) {
    const accountValue = row[options.accountColumn];
    if (accountValue) {
      const key = String(accountValue).trim();
      if (!accountLookups.has(key)) {
        // Try to determine if it's a code or name (codes are usually shorter/alphanumeric)
        const isLikelyCode = /^[A-Z0-9-]+$/i.test(key) && key.length <= 20;
        accountLookups.set(key, {
          accountCode: isLikelyCode ? key : undefined,
          accountName: isLikelyCode ? undefined : key,
        });
      }
    }
  }

  // Batch resolve accounts
  const accountCache = new Map<string, { id: string; code: string; name: string } | null>();
  for (const [key, lookup] of accountLookups.entries()) {
    const resolved = await resolveAccount(companyId, lookup.accountCode, lookup.accountName);
    accountCache.set(key, resolved);
  }

  // Process each voucher group
  for (const [voucherKey, groupRows] of groups.entries()) {
    const voucherErrors: string[] = [];
    const voucherWarnings: string[] = [];

    // Parse header from first row
    const firstRow = groupRows[0];
    const date = parseDate(firstRow[options.dateColumn]);
    if (!date) {
      voucherErrors.push(`Invalid date: ${firstRow[options.dateColumn]}`);
    }

    const type = options.typeColumn && firstRow[options.typeColumn]
      ? (firstRow[options.typeColumn] as VoucherType)
      : options.constantType || VoucherType.JOURNAL;

    const referenceNo = options.referenceNoColumn && firstRow[options.referenceNoColumn]
      ? String(firstRow[options.referenceNoColumn])
      : options.constantReferenceNo || undefined;

    const narration = options.narrationColumn && firstRow[options.narrationColumn]
      ? String(firstRow[options.narrationColumn])
      : undefined;

    const vendor = options.vendorColumn && firstRow[options.vendorColumn]
      ? String(firstRow[options.vendorColumn])
      : undefined;

    // Parse lines
    const lines: VoucherGroup['lines'] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (let i = 0; i < groupRows.length; i++) {
      const row = groupRows[i];
      const accountValue = String(row[options.accountColumn] || '').trim();
      const debit = parseNumber(row[options.debitColumn]);
      const credit = parseNumber(row[options.creditColumn]);

      // Validate debit/credit
      if (debit > 0 && credit > 0) {
        voucherErrors.push(`Row ${i + 1}: Both debit and credit cannot be greater than 0`);
      }

      // Resolve account
      const account = accountCache.get(accountValue);
      if (!account) {
        voucherErrors.push(`Row ${i + 1}: Account not found: ${accountValue}`);
        unresolvedAccounts.push({
          accountCode: /^[A-Z0-9-]+$/i.test(accountValue) && accountValue.length <= 20 ? accountValue : undefined,
          accountName: /^[A-Z0-9-]+$/i.test(accountValue) && accountValue.length <= 20 ? undefined : accountValue,
          rowIndex: rows.indexOf(row),
        });
        continue;
      }

      const description = options.lineMemoColumn && row[options.lineMemoColumn]
        ? String(row[options.lineMemoColumn])
        : undefined;

      lines.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit,
        credit,
        description,
      });

      totalDebit += debit;
      totalCredit += credit;
    }

    // Validate balance
    const difference = Math.abs(totalDebit - totalCredit);
    if (difference >= 0.01) {
      voucherErrors.push(
        `Voucher is not balanced. Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}, Difference: ${difference.toFixed(2)}`
      );
    }

    if (lines.length < 2) {
      voucherErrors.push('Voucher must have at least 2 lines');
    }

    vouchers.push({
      key: voucherKey,
      header: {
        date: date || new Date(),
        type,
        referenceNo,
        narration,
        vendor,
      },
      lines,
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        difference,
      },
      errors: voucherErrors,
      warnings: voucherWarnings,
    });

    // Collect errors and warnings
    voucherErrors.forEach((err) => errors.push({ voucherKey, message: err }));
    voucherWarnings.forEach((warn) => warnings.push({ voucherKey, message: warn }));
  }

  return {
    vouchers,
    totalRows: rows.length,
    totalVouchers: vouchers.length,
    errors,
    warnings,
    unresolvedAccounts: Array.from(
      new Map(unresolvedAccounts.map((item) => [`${item.accountCode || item.accountName}`, item])).values()
    ),
  };
}

/**
 * Convert VoucherType string to enum
 */
export function parseVoucherType(value: string | null | undefined): VoucherType | null {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA'].includes(upper)) {
    return upper as VoucherType;
  }
  return null;
}
