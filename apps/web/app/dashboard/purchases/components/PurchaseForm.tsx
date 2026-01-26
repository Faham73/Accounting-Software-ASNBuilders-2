'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type PurchaseLineType = 'MATERIAL' | 'SERVICE' | 'OTHER';

interface PurchaseLine {
  id?: string;
  lineType: PurchaseLineType;
  productId?: string | null;
  stockItemId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unitRate?: number | null;
  description?: string | null;
  lineTotal: number;
}

interface PurchaseAttachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}

interface Purchase {
  id: string;
  date: string;
  challanNo: string | null;
  projectId: string;
  subProjectId: string | null;
  supplierVendorId: string;
  reference: string | null;
  discountPercent: number | null;
  paidAmount: number;
  paymentAccountId: string | null;
  lines: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: { id: string; name: string; unit: string };
  }>;
  attachments: PurchaseAttachment[];
}

interface PurchaseFormProps {
  purchase?: Purchase;
}

interface Project {
  id: string;
  name: string;
  isMain: boolean;
  parentProjectId: string | null;
}

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface StockItem {
  id: string;
  name: string;
  unit: string;
  category?: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

function toDateInputValue(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string') {
    if (!input) return '';
    if (input.includes('T')) return input.split('T')[0];
    return input.slice(0, 10);
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return '';
    return input.toISOString().slice(0, 10);
  }
  return '';
}

export default function PurchaseForm({ purchase }: PurchaseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [subProjects, setSubProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [formData, setFormData] = useState({
    date: toDateInputValue(purchase?.date || new Date()),
    challanNo: purchase?.challanNo || '',
    projectId: purchase?.projectId || '',
    subProjectId: purchase?.subProjectId || '',
    supplierVendorId: purchase?.supplierVendorId || '',
    reference: purchase?.reference || '',
    discountPercent: purchase?.discountPercent?.toString() || '',
    paidAmount: purchase?.paidAmount?.toString() || '0',
    paymentAccountId: purchase?.paymentAccountId || '',
  });

  const [lines, setLines] = useState<PurchaseLine[]>(
    purchase?.lines.map((l: any) => ({
      id: l.id,
      lineType: (l.lineType || 'OTHER') as PurchaseLineType,
      productId: l.productId || null,
      stockItemId: l.stockItemId || null,
      quantity: l.quantity ? Number(l.quantity) : null,
      unit: l.unit || null,
      unitRate: l.unitRate ? Number(l.unitRate) : null,
      description: l.description || null,
      lineTotal: Number(l.lineTotal),
    })) || []
  );

  const [attachments, setAttachments] = useState<PurchaseAttachment[]>(
    purchase?.attachments || []
  );

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, productsRes, stockItemsRes, vendorsRes, accountsRes] = await Promise.all([
          fetch('/api/projects?status=all&active=all'),
          fetch('/api/products'),
          fetch('/api/stock/items?isActive=true'),
          fetch('/api/vendors'),
          fetch('/api/chart-of-accounts?active=true'),
        ]);

        const [projectsData, productsData, stockItemsData, vendorsData, accountsData] = await Promise.all([
          projectsRes.json(),
          productsRes.json(),
          stockItemsRes.json(),
          vendorsRes.json(),
          accountsRes.json(),
        ]);

        if (projectsData.ok) {
          const mainProjects = projectsData.data.filter((p: Project) => p.isMain);
          setProjects(mainProjects);
          if (formData.projectId) {
            const subs = projectsData.data.filter(
              (p: Project) => p.parentProjectId === formData.projectId
            );
            setSubProjects(subs);
          }
        } else {
          console.error('Failed to fetch projects:', projectsData);
        }

        if (productsData.ok) setProducts(productsData.data);
        if (stockItemsData.ok) setStockItems(stockItemsData.data);
        if (vendorsData.ok) setVendors(vendorsData.data);
        if (accountsData.ok) {
          // Filter to leaf accounts (accounts that don't have children)
          // We'll need to check if any other account has this as parent
          const allAccounts = accountsData.data;
          const accountIds = new Set(allAccounts.map((a: Account) => a.id));
          const parentIds = new Set(allAccounts.map((a: Account & { parentId?: string }) => a.parentId).filter(Boolean));
          const leafAccounts = allAccounts.filter((a: Account) => !parentIds.has(a.id));
          setAccounts(leafAccounts);
        }
      } catch (err) {
        console.error('Failed to fetch dropdown data:', err);
      }
    };

    fetchData();
  }, []);


  // Update sub-projects when main project changes
  useEffect(() => {
    const fetchSubProjects = async () => {
      if (!formData.projectId) {
        setSubProjects([]);
        setFormData((prev) => ({ ...prev, subProjectId: '' }));
        return;
      }

      try {
        const response = await fetch('/api/projects?status=all&active=all');
        const data = await response.json();
        if (data.ok) {
          const subs = data.data.filter(
            (p: Project) => p.parentProjectId === formData.projectId
          );
          setSubProjects(subs);
          // Clear sub-project if it's not a child of the new main project
          if (formData.subProjectId && !subs.find((p: Project) => p.id === formData.subProjectId)) {
            setFormData((prev) => ({ ...prev, subProjectId: '' }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch sub-projects:', err);
      }
    };

    fetchSubProjects();
  }, [formData.projectId]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        lineType: 'OTHER',
        productId: null,
        stockItemId: null,
        quantity: null,
        unit: null,
        unitRate: null,
        description: null,
        lineTotal: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof PurchaseLine, value: any) => {
    const newLines = [...lines];
    const line = newLines[index];
    newLines[index] = { ...line, [field]: value };

    // When lineType changes, reset relevant fields
    if (field === 'lineType') {
      if (value === 'MATERIAL') {
        newLines[index] = {
          ...line,
          lineType: value,
          productId: null,
          stockItemId: null,
          quantity: null,
          unit: null,
          unitRate: null,
          description: null,
          lineTotal: 0,
        };
      } else if (value === 'SERVICE') {
        newLines[index] = {
          ...line,
          lineType: value,
          productId: null,
          stockItemId: null,
          quantity: null,
          unit: null,
          unitRate: null,
          description: null,
          lineTotal: 0,
        };
      } else {
        newLines[index] = {
          ...line,
          lineType: value,
          productId: null,
          stockItemId: null,
          quantity: null,
          unit: null,
          unitRate: null,
          description: null,
          lineTotal: 0,
        };
      }
    }

    // When stockItemId changes, update unit from stockItem
    if (field === 'stockItemId' && value) {
      const stockItem = stockItems.find((si) => si.id === value);
      if (stockItem) {
        newLines[index].unit = stockItem.unit;
      }
    }

    // Recalculate line total for MATERIAL and SERVICE
    if (field === 'quantity' || field === 'unitRate') {
      const quantity = field === 'quantity' ? (value || 0) : (line.quantity || 0);
      const unitRate = field === 'unitRate' ? (value || 0) : (line.unitRate || 0);
      if (line.lineType === 'MATERIAL' || line.lineType === 'SERVICE') {
        newLines[index].lineTotal = quantity * unitRate;
      }
    }

    // For OTHER lines, lineTotal is entered directly
    if (field === 'lineTotal' && line.lineType === 'OTHER') {
      newLines[index].lineTotal = value || 0;
    }

    setLines(newLines);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const discount = formData.discountPercent
      ? (subtotal * parseFloat(formData.discountPercent)) / 100
      : 0;
    const total = subtotal - discount;
    const paid = parseFloat(formData.paidAmount) || 0;
    const due = total - paid;

    return { subtotal, discount, total, paid, due };
  };

  const handleFileUpload = async (file: File) => {
    // For now, we'll create a placeholder URL
    // In production, you'd upload to S3 or your file storage
    const formData = new FormData();
    formData.append('file', file);

    try {
      // If you have an upload endpoint, use it here
      // For now, create a mock attachment
      const attachment: PurchaseAttachment = {
        fileName: file.name,
        fileUrl: URL.createObjectURL(file), // Temporary URL
        mimeType: file.type,
        sizeBytes: file.size,
      };

      setAttachments([...attachments, attachment]);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload file');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.projectId) {
      setError('Main project is required');
      return;
    }
    if (!formData.supplierVendorId) {
      setError('Vendor is required');
      return;
    }
    if (lines.length === 0) {
      setError('At least one product line is required');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.lineType === 'MATERIAL') {
        if (!line.stockItemId) {
          setError(`Line ${i + 1}: Stock item is required for MATERIAL lines`);
          return;
        }
        if (!line.quantity || line.quantity <= 0) {
          setError(`Line ${i + 1}: Quantity must be greater than 0 for MATERIAL lines`);
          return;
        }
        if (!line.unitRate || line.unitRate < 0) {
          setError(`Line ${i + 1}: Unit rate is required for MATERIAL lines`);
          return;
        }
      } else if (line.lineType === 'SERVICE') {
        if (!line.description) {
          setError(`Line ${i + 1}: Description is required for SERVICE lines`);
          return;
        }
        if (line.lineTotal <= 0) {
          setError(`Line ${i + 1}: Amount must be greater than 0 for SERVICE lines`);
          return;
        }
      } else if (line.lineType === 'OTHER') {
        if (line.lineTotal <= 0) {
          setError(`Line ${i + 1}: Amount must be greater than 0 for OTHER lines`);
          return;
        }
      }
    }

    const { total, paid } = calculateTotals();
    if (paid > total) {
      setError('Paid amount cannot exceed total amount');
      return;
    }

    // Validate payment account is required when paid amount > 0
    if (paid > 0 && !formData.paymentAccountId) {
      setError('Payment account is required when paid amount > 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        date: formData.date,
        challanNo: formData.challanNo || null,
        projectId: formData.projectId,
        subProjectId: formData.subProjectId || null,
        supplierVendorId: formData.supplierVendorId,
        reference: formData.reference || null,
        discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
        paidAmount: parseFloat(formData.paidAmount) || 0,
        paymentAccountId: formData.paymentAccountId || null,
        lines: lines.map((line) => ({
          lineType: line.lineType,
          productId: line.productId || null,
          stockItemId: line.stockItemId || null,
          quantity: line.quantity || null,
          unit: line.unit || null,
          unitRate: line.unitRate || null,
          description: line.description || null,
          lineTotal: line.lineTotal,
        })),
        attachments: attachments,
      };

      const url = purchase ? `/api/purchases/${purchase.id}` : '/api/purchases';
      const method = purchase ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        router.push('/dashboard/purchases');
        router.refresh();
      } else {
        setError(data.error || 'Failed to save purchase');
      }
    } catch (err) {
      setError('An error occurred while saving the purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, discount, total, paid, due } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date *</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Challan Number</label>
          <input
            type="text"
            value={formData.challanNo}
            onChange={(e) => setFormData({ ...formData, challanNo: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Main Project *</label>
          <select
            required
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value, subProjectId: '' })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {projects.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">No main projects found. Please create a main project first.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Sub Project</label>
          <select
            value={formData.subProjectId}
            onChange={(e) => setFormData({ ...formData, subProjectId: e.target.value })}
            disabled={!formData.projectId || subProjects.length === 0}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">None</option>
            {subProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Vendor *</label>
          <select
            required
            value={formData.supplierVendorId}
            onChange={(e) => setFormData({ ...formData, supplierVendorId: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reference</label>
          <input
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Line Items</h3>
          <button
            type="button"
            onClick={addLine}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Line Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item/Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-6 py-4">
                    <select
                      required
                      value={line.lineType}
                      onChange={(e) => updateLine(index, 'lineType', e.target.value)}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MATERIAL">Material</option>
                      <option value="SERVICE">Service</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {line.lineType === 'MATERIAL' ? (
                      <div className="space-y-2">
                        <select
                          required
                          value={line.stockItemId || ''}
                          onChange={(e) => updateLine(index, 'stockItemId', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select material</option>
                          {stockItems.map((si) => (
                            <option key={si.id} value={si.id}>
                              {si.name}
                            </option>
                          ))}
                        </select>
                        <Link
                          href="/dashboard/stock/items"
                          target="_blank"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Manage Materials
                        </Link>
                      </div>
                    ) : line.lineType === 'SERVICE' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Service description"
                          value={line.description || ''}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Expense description"
                          value={line.description || ''}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(line.lineType === 'MATERIAL' || line.lineType === 'SERVICE') ? (
                      <input
                        type="number"
                        required={line.lineType === 'MATERIAL'}
                        min="0.001"
                        step="0.001"
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || null)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(line.lineType === 'MATERIAL' || line.lineType === 'SERVICE') ? (
                      <input
                        type="text"
                        value={line.unit || ''}
                        onChange={(e) => updateLine(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(line.lineType === 'MATERIAL' || line.lineType === 'SERVICE') ? (
                      <input
                        type="number"
                        required={line.lineType === 'MATERIAL'}
                        min="0"
                        step="0.01"
                        value={line.unitRate || ''}
                        onChange={(e) => updateLine(index, 'unitRate', parseFloat(e.target.value) || null)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {line.lineType === 'OTHER' ? (
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={line.lineTotal || ''}
                        onChange={(e) => updateLine(index, 'lineTotal', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="number"
                        readOnly
                        value={line.lineTotal.toFixed(2)}
                        className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 shadow-sm"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discountPercent}
              onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Total Price</label>
            <input
              type="text"
              readOnly
              value={total.toFixed(2)}
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Paid Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Due Amount</label>
            <input
              type="text"
              readOnly
              value={due.toFixed(2)}
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Type + Account Number
              {parseFloat(formData.paidAmount) > 0 && <span className="text-red-500"> *</span>}
            </label>
            <select
              value={formData.paymentAccountId}
              onChange={(e) => setFormData({ ...formData, paymentAccountId: e.target.value })}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 ${
                parseFloat(formData.paidAmount) > 0 && !formData.paymentAccountId
                  ? 'border-red-300 bg-red-50 focus:border-red-500'
                  : 'border-gray-300 bg-white focus:border-blue-500'
              }`}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name} ({a.type})
                </option>
              ))}
            </select>
            {parseFloat(formData.paidAmount) > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Required when Paid Amount &gt; 0
              </p>
            )}
            {parseFloat(formData.paidAmount) > 0 && !formData.paymentAccountId && (
              <p className="mt-1 text-xs text-red-600">
                Please select a payment account
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Document Files</label>
            <input
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  Array.from(e.target.files).forEach((file) => handleFileUpload(file));
                }
              }}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((att, index) => (
                  <li key={index} className="flex items-center justify-between text-sm">
                    <span>{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : purchase ? 'Update' : 'Create'}
        </button>
      </div>

    </form>
  );
}
