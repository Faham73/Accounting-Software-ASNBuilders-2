'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: { id: string; name: string } | null;
  defaultPurchasePrice: number;
  defaultSalePrice: number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
}

interface ProductsListProps {
  canWrite: boolean;
}

export default function ProductsList({ canWrite }: ProductsListProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    isActive: 'true',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.isActive !== 'all') params.append('isActive', filters.isActive);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setProducts(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filters.search, filters.categoryId, filters.isActive, page, pageSize]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This will deactivate it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.ok) {
        fetchProducts();
      } else {
        alert(data.error || 'Failed to delete product');
      }
    } catch (error) {
      alert('An error occurred while deleting the product');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 space-y-4 md:flex md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by code or name..."
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

      {/* Page Size Selector */}
      <div className="mb-4 flex items-center space-x-2">
        <label className="text-sm text-gray-700">Show entries:</label>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No products found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company/Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-12 w-12 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.png';
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Company
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.defaultPurchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.defaultSalePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stock.toFixed(3)} {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      {canWrite && (
                        <>
                          <Link
                            href={`/dashboard/products/${product.id}/edit`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
