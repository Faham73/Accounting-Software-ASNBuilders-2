'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StockItem {
  id: string;
  name: string;
  unit: string;
}

interface Project {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function ReceiveStockForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [formData, setFormData] = useState({
    stockItemId: '',
    qty: '',
    unitCost: '',
    projectId: '',
    vendorId: '',
    referenceType: '',
    referenceId: '',
    notes: '',
    movementDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Fetch stock items
    fetch('/api/stock/items?pageSize=1000&isActive=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStockItems(data.data);
        }
      });

    // Fetch projects
    fetch('/api/projects?pageSize=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setProjects(data.data);
        }
      });

    // Fetch vendors
    fetch('/api/vendors?pageSize=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setVendors(data.data);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/stock/movements/in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockItemId: formData.stockItemId,
          qty: parseFloat(formData.qty),
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
          projectId: formData.projectId || null,
          vendorId: formData.vendorId || null,
          referenceType: formData.referenceType || undefined,
          referenceId: formData.referenceId || undefined,
          notes: formData.notes || null,
          movementDate: formData.movementDate ? `${formData.movementDate}T00:00:00Z` : undefined,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        alert('Stock received successfully!');
        router.push('/dashboard/stock');
      } else {
        alert(data.error || 'Failed to receive stock');
        setIsSubmitting(false);
      }
    } catch (error) {
      alert('An error occurred while receiving stock');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="stockItemId" className="block text-sm font-medium text-gray-700">
          Stock Item *
        </label>
        {isLoadingItems ? (
          <div className="mt-1 text-sm text-gray-500">Loading items...</div>
        ) : itemsError ? (
          <div className="mt-1 text-sm text-red-600">
            {itemsError}
          </div>
        ) : stockItems.length === 0 ? (
          <div className="mt-1 space-y-2">
            <div className="text-sm text-amber-600">
              No materials found. Create materials in Stock Items.
            </div>
            <Link
              href="/dashboard/stock/items/new"
              className="inline-block py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Materials
            </Link>
          </div>
        ) : (
          <select
            id="stockItemId"
            required
            value={formData.stockItemId}
            onChange={(e) => setFormData({ ...formData, stockItemId: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select item...</option>
            {stockItems.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}{item.unit ? ` (${item.unit})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="qty" className="block text-sm font-medium text-gray-700">
            Quantity *
          </label>
          <input
            type="number"
            id="qty"
            required
            step="0.001"
            min="0.001"
            value={formData.qty}
            onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700">
            Unit Cost
          </label>
          <input
            type="number"
            id="unitCost"
            step="0.01"
            min="0"
            value={formData.unitCost}
            onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="movementDate" className="block text-sm font-medium text-gray-700">
          Date *
        </label>
        <input
          type="date"
          id="movementDate"
          required
          value={formData.movementDate}
          onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
            Project
          </label>
          <select
            id="projectId"
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700">
            Vendor
          </label>
          <select
            id="vendorId"
            value={formData.vendorId}
            onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">None</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="referenceType" className="block text-sm font-medium text-gray-700">
            Reference Type
          </label>
          <input
            type="text"
            id="referenceType"
            value={formData.referenceType}
            onChange={(e) => setFormData({ ...formData, referenceType: e.target.value })}
            placeholder="e.g., PURCHASE, VOUCHER"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="referenceId" className="block text-sm font-medium text-gray-700">
            Reference ID
          </label>
          <input
            type="text"
            id="referenceId"
            value={formData.referenceId}
            onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Receiving...' : 'Receive Stock'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
