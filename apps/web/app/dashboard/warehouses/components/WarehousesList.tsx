'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Warehouse {
  id: string;
  name: string;
  type: 'LOCAL' | 'COMPANY';
  isActive: boolean;
  createdAt: string;
}

interface WarehousesListProps {
  canWrite: boolean;
}

export default function WarehousesList({ canWrite }: WarehousesListProps) {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    isActive: 'true',
  });

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.isActive !== 'all') params.append('isActive', filters.isActive);

      const response = await fetch(`/api/warehouses?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setWarehouses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [filters.search, filters.isActive]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse? This will deactivate it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/warehouses/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.ok) {
        fetchWarehouses();
      } else {
        alert(data.error || 'Failed to delete warehouse');
      }
    } catch (error) {
      console.error('Failed to delete warehouse:', error);
      alert('Failed to delete warehouse');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
              className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : warehouses.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No warehouses found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {warehouses.map((warehouse, index) => (
                <tr key={warehouse.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link href={`/dashboard/warehouses/${warehouse.id}`} className="text-blue-600 hover:text-blue-800">
                      {warehouse.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warehouse.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      warehouse.isActive === true
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {warehouse.isActive === true ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/dashboard/warehouses/${warehouse.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                      {canWrite && (
                        <>
                          <Link
                            href={`/dashboard/warehouses/${warehouse.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(warehouse.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
