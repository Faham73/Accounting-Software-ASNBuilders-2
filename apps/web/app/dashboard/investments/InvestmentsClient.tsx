'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Investment {
  id: string;
  date: string;
  amount: number;
  note: string | null;
  project: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface InvestmentsResponse {
  ok: boolean;
  data: Investment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  totals: {
    investments: number;
  };
}

interface Project {
  id: string;
  name: string;
}

export default function InvestmentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    projectId: searchParams.get('projectId') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  });

  useEffect(() => {
    loadProjects();
    loadInvestments();
  }, []);

  useEffect(() => {
    loadInvestments();
  }, [filters, pagination.page]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.ok) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());

      const response = await fetch(`/api/investments?${params.toString()}`);
      const data: InvestmentsResponse = await response.json();
      if (data.ok) {
        setInvestments(data.data);
        setTotal(data.totals.investments);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load investments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD');
  };

  return (
    <div>
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Investment</h3>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(total)}</p>
          </div>
          <div className="text-purple-500 text-4xl">💰</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filters.projectId}
              onChange={(e) => handleFilterChange('projectId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ projectId: '', dateFrom: '', dateTo: '' });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : investments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No investments found</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {investments.map((investment) => (
                  <tr key={investment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(investment.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {investment.project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                      {formatCurrency(investment.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {investment.note || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {investment.createdBy.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
