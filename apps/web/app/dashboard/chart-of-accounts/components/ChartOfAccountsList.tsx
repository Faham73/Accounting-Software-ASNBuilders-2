'use client';

import { useState, useEffect } from 'react';
import { AccountType } from '@accounting/shared';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
  parent?: { id: string; code: string; name: string } | null;
  children?: { id: string }[];
  _count?: { voucherLines: number };
}

interface ChartOfAccountsListProps {
  initialAccounts: Account[];
  canWrite: boolean;
}

export default function ChartOfAccountsList({ initialAccounts, canWrite }: ChartOfAccountsListProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('active', 'true');

      const response = await fetch(`/api/chart-of-accounts?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAccounts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, typeFilter]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const buildTree = (accounts: Account[]): Account[] => {
    const accountMap = new Map<string, Account>();
    const rootAccounts: Account[] = [];

    accounts.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    accounts.forEach((account) => {
      const node = accountMap.get(account.id)!;
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      } else {
        rootAccounts.push(node);
      }
    });

    return rootAccounts;
  };

  const renderAccount = (account: Account, level: number = 0): JSX.Element => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedIds.has(account.id);
    const indent = level * 24;

    return (
      <div key={account.id}>
        <div
          className={`flex items-center py-2 px-4 hover:bg-gray-50 border-b border-gray-200 ${
            level > 0 ? 'bg-gray-50' : ''
          }`}
          style={{ paddingLeft: `${16 + indent}px` }}
        >
          <div className="flex-1 flex items-center">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(account.id)}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="mr-2 w-4" />
            )}
            <span className="font-mono text-sm text-gray-600 w-24">{account.code}</span>
            <span className="flex-1 text-sm text-gray-900">{account.name}</span>
            <span className="text-xs text-gray-500 w-24">{account.type}</span>
            {account._count && account._count.voucherLines > 0 && (
              <span className="text-xs text-gray-400 ml-2">
                ({account._count.voucherLines} lines)
              </span>
            )}
          </div>
          {canWrite && (
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setEditingId(account.id)}
                className="text-blue-600 hover:text-blue-900 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(account.id)}
                className="text-red-600 hover:text-red-900 text-sm"
                disabled={account._count && account._count.voucherLines > 0}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map((child) => {
              const childAccount = accounts.find((a) => a.id === child.id);
              return childAccount ? renderAccount(childAccount, level + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const response = await fetch(`/api/chart-of-accounts/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.ok) {
        fetchAccounts();
      } else {
        alert(data.error || 'Failed to delete account');
      }
    } catch (error) {
      alert('An error occurred while deleting the account');
    }
  };

  const tree = buildTree(accounts);

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 space-y-4 md:flex md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="all">All Types</option>
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
            <option value="EQUITY">Equity</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>
      </div>

      {/* Tree View */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : tree.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No accounts found</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center text-xs font-medium text-gray-500 uppercase">
              <span className="w-4 mr-2" />
              <span className="w-24">Code</span>
              <span className="flex-1">Name</span>
              <span className="w-24">Type</span>
            </div>
          </div>
          <div>
            {tree.map((account) => renderAccount(account))}
          </div>
        </div>
      )}

      {/* Edit Modal - simplified for now, can be enhanced */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              Edit functionality will open the account edit page.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.location.href = `/dashboard/chart-of-accounts/${editingId}`;
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
              >
                Go to Edit Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
