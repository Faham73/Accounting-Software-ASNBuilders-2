'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  categoryId: string | null;
  defaultPurchasePrice: number;
  defaultSalePrice: number;
  imageUrl: string | null;
  isInventory: boolean;
  openingStockQty: number;
  openingStockUnitCost: number;
  inventoryAccountId: string | null;
  isActive: boolean;
}

interface ProductFormProps {
  product?: Product;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [formData, setFormData] = useState({
    code: product?.code || '',
    name: product?.name || '',
    unit: product?.unit || '',
    categoryId: product?.categoryId || '',
    defaultPurchasePrice: product?.defaultPurchasePrice?.toString() || '0',
    defaultSalePrice: product?.defaultSalePrice?.toString() || '0',
    imageUrl: product?.imageUrl || '',
    isInventory: product?.isInventory ?? true,
    openingStockQty: product?.openingStockQty?.toString() || '0',
    openingStockUnitCost: product?.openingStockUnitCost?.toString() || '0',
    inventoryAccountId: product?.inventoryAccountId || '',
  });

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, accountsRes] = await Promise.all([
          fetch('/api/product-categories'),
          fetch('/api/chart-of-accounts?active=true'),
        ]);

        const [categoriesData, accountsData] = await Promise.all([
          categoriesRes.json(),
          accountsRes.json(),
        ]);

        if (categoriesData.ok) {
          setCategories(categoriesData.data);
        } else {
          console.error('Failed to fetch categories:', categoriesData);
        }
        if (accountsData.ok) {
          // Filter to leaf accounts
          const leafAccounts = accountsData.data.filter((a: Account & { children?: any[] }) => 
            !a.children || a.children.length === 0
          );
          setAccounts(leafAccounts);
        }
      } catch (err) {
        console.error('Failed to fetch dropdown data:', err);
      }
    };

    fetchData();
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.ok) {
        setFormData({ ...formData, imageUrl: data.data.url });
      } else {
        alert(data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload image');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.code.trim()) {
      setError('Product code is required');
      return;
    }
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.unit.trim()) {
      setError('Unit is required');
      return;
    }

    const purchasePrice = parseFloat(formData.defaultPurchasePrice) || 0;
    const salePrice = parseFloat(formData.defaultSalePrice) || 0;
    const openingStockQty = parseFloat(formData.openingStockQty) || 0;
    const openingStockUnitCost = parseFloat(formData.openingStockUnitCost) || 0;

    if (purchasePrice < 0) {
      setError('Purchase price must be non-negative');
      return;
    }
    if (salePrice < 0) {
      setError('Sale price must be non-negative');
      return;
    }
    if (openingStockQty < 0) {
      setError('Opening stock quantity must be non-negative');
      return;
    }
    if (openingStockUnitCost < 0) {
      setError('Opening stock unit cost must be non-negative');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        categoryId: formData.categoryId || null,
        defaultPurchasePrice: purchasePrice,
        defaultSalePrice: salePrice,
        imageUrl: formData.imageUrl || null,
        isInventory: formData.isInventory,
        openingStockQty,
        openingStockUnitCost,
        inventoryAccountId: formData.inventoryAccountId || null,
      };

      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        router.push('/dashboard/products');
        router.refresh();
      } else {
        setError(data.error || 'Failed to save product');
      }
    } catch (err) {
      setError('An error occurred while saving the product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Code *</label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Product Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Unit *</label>
          <input
            type="text"
            required
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="e.g., kg, pcs, m"
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">No categories yet. Categories are optional.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default Purchase Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.defaultPurchasePrice}
            onChange={(e) => setFormData({ ...formData, defaultPurchasePrice: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default Sale Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.defaultSalePrice}
            onChange={(e) => setFormData({ ...formData, defaultSalePrice: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Is Inventory</label>
          <input
            type="checkbox"
            checked={formData.isInventory}
            onChange={(e) => setFormData({ ...formData, isInventory: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Inventory Account</label>
          <select
            value={formData.inventoryAccountId}
            onChange={(e) => setFormData({ ...formData, inventoryAccountId: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name} ({acc.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Opening Stock Quantity</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={formData.openingStockQty}
            onChange={(e) => setFormData({ ...formData, openingStockQty: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Opening Stock Unit Cost</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.openingStockUnitCost}
            onChange={(e) => setFormData({ ...formData, openingStockUnitCost: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {formData.imageUrl && (
            <div className="mt-2">
              <img
                src={formData.imageUrl}
                alt="Product preview"
                className="h-24 w-24 object-cover rounded"
              />
            </div>
          )}
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
          {isSubmitting ? 'Saving...' : product ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
