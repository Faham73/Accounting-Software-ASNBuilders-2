'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Warehouse {
  id: string;
  name: string;
  type: 'LOCAL' | 'COMPANY';
  isActive: boolean;
}

interface WarehouseFormProps {
  warehouse?: Warehouse;
}

export default function WarehouseForm({ warehouse }: WarehouseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: warehouse?.name || '',
    type: (warehouse?.type || 'LOCAL') as 'LOCAL' | 'COMPANY',
    isActive: warehouse?.isActive ?? true,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = warehouse ? `/api/warehouses/${warehouse.id}` : '/api/warehouses';
      const method = warehouse ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.ok) {
        router.push('/dashboard/warehouses');
      } else {
        setError(data.error || 'Failed to save warehouse');
      }
    } catch (err) {
      setError('Failed to save warehouse');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Local, LinkUp Corporation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'LOCAL' | 'COMPANY' })}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOCAL">Local</option>
              <option value="COMPANY">Company</option>
            </select>
          </div>

          {warehouse && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          )}
        </div>

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
            {isSubmitting ? 'Saving...' : warehouse ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
