'use client';

import { useState } from 'react';
import { VoucherType } from '@accounting/db';
import { toMoney } from '@/lib/payables';

interface ImportOptions {
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

interface VoucherPreview {
  key: string;
  header: {
    date: string;
    type?: string;
    referenceNo?: string;
    narration?: string;
    vendor?: string;
  };
  lines: Array<{
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

interface ParseResult {
  headers: string[];
  totalRows: number;
  totalVouchers: number;
  vouchers: VoucherPreview[];
  errors: Array<{ voucherKey: string; message: string }>;
  warnings: Array<{ voucherKey: string; message: string }>;
  unresolvedAccounts: Array<{ accountCode?: string; accountName?: string; rowIndex: number }>;
  hasMore: boolean;
}

type Step = 1 | 2 | 3 | 4;

export default function ImportTransactionsClient() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [options, setOptions] = useState<ImportOptions>({
    dateColumn: '',
    accountColumn: '',
    debitColumn: '',
    creditColumn: '',
  });
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const targetFields = [
    { value: '', label: 'Skip column' },
    { value: 'voucherKey', label: 'Voucher Key / Voucher No' },
    { value: 'date', label: 'Date (required)' },
    { value: 'account', label: 'Account Code/Name (required)' },
    { value: 'debit', label: 'Debit (required)' },
    { value: 'credit', label: 'Credit (required)' },
    { value: 'type', label: 'Voucher Type' },
    { value: 'referenceNo', label: 'Reference No' },
    { value: 'narration', label: 'Narration (header)' },
    { value: 'lineMemo', label: 'Line Memo/Description' },
    { value: 'vendor', label: 'Vendor/Payee' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      // First, we need to read the file to get headers
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tools/import/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to parse file');
      }

      setHeaders(data.data.headers);
      
      // Auto-map common column names
      const autoMapping: Record<string, string> = {};
      data.data.headers.forEach((header: string) => {
        const lower = header.toLowerCase();
        if (lower.includes('voucher') || lower.includes('voucher no')) {
          autoMapping[header] = 'voucherKey';
        } else if (lower.includes('date')) {
          autoMapping[header] = 'date';
        } else if (lower.includes('account') && !lower.includes('name')) {
          autoMapping[header] = 'account';
        } else if (lower.includes('debit')) {
          autoMapping[header] = 'debit';
        } else if (lower.includes('credit')) {
          autoMapping[header] = 'credit';
        } else if (lower.includes('type')) {
          autoMapping[header] = 'type';
        } else if (lower.includes('reference') || lower.includes('ref')) {
          autoMapping[header] = 'referenceNo';
        } else if (lower.includes('narration') || lower.includes('memo')) {
          autoMapping[header] = 'narration';
        } else if (lower.includes('description') || lower.includes('memo')) {
          autoMapping[header] = 'lineMemo';
        } else if (lower.includes('vendor') || lower.includes('payee')) {
          autoMapping[header] = 'vendor';
        }
      });

      setMapping(autoMapping);
      
      // Set required fields from auto-mapping
      const dateCol = Object.keys(autoMapping).find((k) => autoMapping[k] === 'date');
      const accountCol = Object.keys(autoMapping).find((k) => autoMapping[k] === 'account');
      const debitCol = Object.keys(autoMapping).find((k) => autoMapping[k] === 'debit');
      const creditCol = Object.keys(autoMapping).find((k) => autoMapping[k] === 'credit');

      setOptions({
        ...options,
        dateColumn: dateCol || '',
        accountColumn: accountCol || '',
        debitColumn: debitCol || '',
        creditColumn: creditCol || '',
        voucherKeyColumn: Object.keys(autoMapping).find((k) => autoMapping[k] === 'voucherKey') || null,
        typeColumn: Object.keys(autoMapping).find((k) => autoMapping[k] === 'type') || null,
        referenceNoColumn: Object.keys(autoMapping).find((k) => autoMapping[k] === 'referenceNo') || null,
        narrationColumn: Object.keys(autoMapping).find((k) => autoMapping[k] === 'narration') || null,
        lineMemoColumn: Object.keys(autoMapping).find((k) => autoMapping[k] === 'lineMemo') || null,
        vendorColumn: Object.keys(autoMapping).find((k) => autoMapping[k] === 'vendor') || null,
      });

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleMappingChange = (column: string, target: string) => {
    const newMapping = { ...mapping };
    if (target === '') {
      newMapping[column] = null;
    } else {
      newMapping[column] = target;
    }
    setMapping(newMapping);

    // Update options based on mapping
    const newOptions = { ...options };
    if (target === 'date') newOptions.dateColumn = column;
    if (target === 'account') newOptions.accountColumn = column;
    if (target === 'debit') newOptions.debitColumn = column;
    if (target === 'credit') newOptions.creditColumn = column;
    if (target === 'voucherKey') newOptions.voucherKeyColumn = column;
    if (target === 'type') newOptions.typeColumn = column;
    if (target === 'referenceNo') newOptions.referenceNoColumn = column;
    if (target === 'narration') newOptions.narrationColumn = column;
    if (target === 'lineMemo') newOptions.lineMemoColumn = column;
    if (target === 'vendor') newOptions.vendorColumn = column;

    setOptions(newOptions);
  };

  const handlePreview = async () => {
    if (!file) {
      setError('No file selected');
      return;
    }

    if (!options.dateColumn || !options.accountColumn || !options.debitColumn || !options.creditColumn) {
      setError('Please map all required fields: Date, Account, Debit, Credit');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('options', JSON.stringify(options));

      const response = await fetch('/api/tools/import/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to parse file');
      }

      setParseResult(data.data);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) {
      setError('No parsed data available');
      return;
    }

    if (parseResult.errors.length > 0) {
      setError('Cannot import vouchers with errors. Please fix errors first.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/tools/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vouchers: parseResult.vouchers,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to import vouchers');
      }

      setImportResult(data.data);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import vouchers');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkPost = async () => {
    if (!importResult || !importResult.voucherIds || importResult.voucherIds.length === 0) {
      setError('No vouchers to post');
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const response = await fetch('/api/tools/import/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherIds: importResult.voucherIds,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to post vouchers');
      }

      setImportResult({
        ...importResult,
        postingResult: data.data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post vouchers');
    } finally {
      setIsPosting(false);
    }
  };

  const canProceedToStep2 = file !== null;
  const canProceedToStep3 =
    options.dateColumn && options.accountColumn && options.debitColumn && options.creditColumn;
  const canProceedToStep4 = parseResult && parseResult.errors.length === 0;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step >= s
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {s}
              </div>
              <div className="ml-2 text-sm font-medium text-gray-700">
                {s === 1 && 'Upload'}
                {s === 2 && 'Map Columns'}
                {s === 3 && 'Preview'}
                {s === 4 && 'Import'}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Upload File</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV or XLSX file (max 10MB)
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={!canProceedToStep2 || isParsing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isParsing ? 'Parsing...' : 'Upload & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Map Columns</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Map each column from your file to the corresponding voucher field. Required fields are
              marked with *.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Column Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Map To
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {headers.map((header) => (
                    <tr key={header}>
                      <td className="px-4 py-3 text-sm text-gray-900">{header}</td>
                      <td className="px-4 py-3">
                        <select
                          value={mapping[header] || ''}
                          onChange={(e) => handleMappingChange(header, e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {targetFields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handlePreview}
                disabled={!canProceedToStep3 || isParsing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isParsing ? 'Parsing...' : 'Preview & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Validation */}
      {step === 3 && parseResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Preview & Validation</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Rows</div>
                <div className="text-2xl font-bold text-gray-900">{parseResult.totalRows}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Vouchers</div>
                <div className="text-2xl font-bold text-gray-900">{parseResult.totalVouchers}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Errors</div>
                <div className="text-2xl font-bold text-red-600">{parseResult.errors.length}</div>
              </div>
            </div>

            {parseResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Validation Errors</h3>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {parseResult.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>
                      {err.voucherKey}: {err.message}
                    </li>
                  ))}
                  {parseResult.errors.length > 10 && (
                    <li>... and {parseResult.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}

            {parseResult.unresolvedAccounts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">Unresolved Accounts</h3>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {parseResult.unresolvedAccounts.slice(0, 10).map((acc, idx) => (
                    <li key={idx}>
                      {acc.accountCode || acc.accountName} (Row {acc.rowIndex + 1})
                    </li>
                  ))}
                  {parseResult.unresolvedAccounts.length > 10 && (
                    <li>... and {parseResult.unresolvedAccounts.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Preview (First 10 Vouchers)</h3>
              <div className="space-y-4">
                {parseResult.vouchers.slice(0, 10).map((voucher) => (
                  <div key={voucher.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">Voucher: {voucher.key}</div>
                        <div className="text-sm text-gray-600">
                          Date: {new Date(voucher.header.date).toLocaleDateString()}
                          {voucher.header.type && ` | Type: ${voucher.header.type}`}
                        </div>
                      </div>
                      {voucher.errors.length > 0 && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          {voucher.errors.length} error(s)
                        </span>
                      )}
                    </div>
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left">Account</th>
                          <th className="px-2 py-1 text-right">Debit</th>
                          <th className="px-2 py-1 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucher.lines.map((line, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1">
                              {line.accountCode} - {line.accountName}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {line.debit > 0 ? toMoney(line.debit) : '-'}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {line.credit > 0 ? toMoney(line.credit) : '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-medium border-t">
                          <td className="px-2 py-1">Total</td>
                          <td className="px-2 py-1 text-right">{toMoney(voucher.totals.debit)}</td>
                          <td className="px-2 py-1 text-right">{toMoney(voucher.totals.credit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={!canProceedToStep4 || isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importing...' : 'Import Vouchers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Import Results */}
      {step === 4 && importResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: Import Results</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Imported</div>
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Skipped</div>
                <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Errors</div>
                <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Import Errors</h3>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {importResult.errors.map((err: any, idx: number) => (
                    <li key={idx}>
                      {err.voucherKey}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.imported > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-4">
                  Successfully imported {importResult.imported} voucher(s) as DRAFT.
                </p>
                {!importResult.postingResult && (
                  <button
                    onClick={handleBulkPost}
                    disabled={isPosting}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isPosting ? 'Posting...' : 'Bulk Post Imported Vouchers'}
                  </button>
                )}
                {importResult.postingResult && (
                  <div className="mt-4">
                    <p className="text-sm text-green-800 mb-2">
                      Posted: {importResult.postingResult.posted} | Skipped:{' '}
                      {importResult.postingResult.skipped}
                    </p>
                    {importResult.postingResult.errors.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {importResult.postingResult.errors.map((err: any, idx: number) => (
                          <li key={idx}>
                            Voucher {err.voucherId}: {err.error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setHeaders([]);
                  setMapping({});
                  setOptions({
                    dateColumn: '',
                    accountColumn: '',
                    debitColumn: '',
                    creditColumn: '',
                  });
                  setParseResult(null);
                  setImportResult(null);
                  setError(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Import Another File
              </button>
              <a
                href="/dashboard/vouchers"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                View Vouchers
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
