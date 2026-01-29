'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LaborByType {
  DAY: number;
  MONTHLY: number;
}

interface ProjectTotals {
  purchases: number;
  stocks: number;
  investments: number;
  labor: number;
  laborByType: LaborByType;
  debit: number;
  credit: number;
}

interface ProjectDashboardClientProps {
  projectId: string;
  projectName: string;
}

export default function ProjectDashboardClient({
  projectId,
  projectName,
}: ProjectDashboardClientProps) {
  const router = useRouter();
  const [totals, setTotals] = useState<ProjectTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showLaborPopover, setShowLaborPopover] = useState(false);

  useEffect(() => {
    loadTotals();
  }, [projectId]);

  const loadTotals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/totals`);
      const data = await response.json();
      if (data.ok) {
        setTotals(data.data);
      } else {
        setError(data.error || 'Failed to load totals');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load totals');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleViewPurchases = () => {
    router.push(`/dashboard/projects/${projectId}/purchases`);
  };

  const handleViewStock = () => {
    router.push(`/dashboard/projects/${projectId}/stock`);
  };

  const handleAddInvestment = () => {
    setShowInvestmentModal(true);
  };

  const handleLaborCardClick = () => {
    setShowLaborPopover((v) => !v);
  };

  const handleInvestmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      date: formData.get('date'),
      amount: parseFloat(formData.get('amount') as string),
      note: formData.get('note') || null,
    };

    try {
      const response = await fetch(`/api/projects/${projectId}/investments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.ok) {
        setShowInvestmentModal(false);
        loadTotals();
        (e.target as HTMLFormElement).reset();
      } else {
        alert(result.error || 'Failed to create investment');
      }
    } catch (err) {
      alert('Failed to create investment');
    }
  };


  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error: {error}</div>;
  }

  if (!totals) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Purchases */}
        <div
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200"
          onClick={handleViewPurchases}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Purchases</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.purchases)}</p>
            </div>
            <div className="text-blue-500 text-3xl">📦</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Click to view purchases</p>
        </div>

        {/* Total Stocks */}
        <div
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-200"
          onClick={handleViewStock}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Stocks</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.stocks)}</p>
            </div>
            <div className="text-green-500 text-3xl">📊</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Click to view stock</p>
        </div>

        {/* Total Investments */}
        <div
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-purple-200"
          onClick={handleAddInvestment}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Investment</h3>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totals.investments)}</p>
            </div>
            <div className="text-purple-500 text-3xl">💰</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Click to add investment</p>
        </div>

        {/* Total Labor — drill-down popover */}
        <div className="relative">
          <div
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-orange-200"
            onClick={handleLaborCardClick}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Labor</h3>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.labor)}</p>
              </div>
              <div className="text-orange-500 text-3xl">👷</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Click for Day / Monthly breakdown</p>
          </div>
          {showLaborPopover && (
            <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white rounded-lg shadow-lg border border-orange-200 py-2 min-w-[220px]">
              <div className="px-4 py-2 border-b border-gray-100 font-medium text-gray-700">Labor by type</div>
              <Link
                href={`/dashboard/projects/${projectId}/labor/day`}
                className="block px-4 py-2 hover:bg-orange-50 text-orange-700"
                onClick={() => setShowLaborPopover(false)}
              >
                Day Labor — {formatCurrency(totals.laborByType?.DAY ?? 0)}
              </Link>
              <Link
                href={`/dashboard/projects/${projectId}/labor/monthly`}
                className="block px-4 py-2 hover:bg-orange-50 text-orange-700"
                onClick={() => setShowLaborPopover(false)}
              >
                Monthly Employee — {formatCurrency(totals.laborByType?.MONTHLY ?? 0)}
              </Link>
            </div>
          )}
        </div>

        {/* Total Debit */}
        <Link
          href="/dashboard/debit"
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-red-200 block"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Debit</h3>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.debit)}</p>
            </div>
            <div className="text-red-500 text-3xl">📉</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">View all debits</p>
        </Link>

        {/* Total Credit */}
        <Link
          href={`/dashboard/credit?projectId=${projectId}`}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-indigo-200 block"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Credit</h3>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totals.credit)}</p>
            </div>
            <div className="text-indigo-500 text-3xl">📈</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">View project credits</p>
        </Link>
      </div>

      {/* Investment Modal */}
      {showInvestmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add Investment</h2>
            <form onSubmit={handleInvestmentSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <textarea
                  name="note"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                >
                  Add Investment
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvestmentModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
