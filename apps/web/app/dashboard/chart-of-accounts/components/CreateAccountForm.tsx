'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AccountType } from '@accounting/shared';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
}

export default function CreateAccountForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'ASSET' as AccountType,
    parentId: '',
    isActive: true,
  });

  useEffect(() => {
    // Fetch accounts for parent selection
    fetch('/api/chart-of-accounts?active=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setAccounts(data.data);
        }
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        parentId: formData.parentId || null,
        isActive: formData.isActive,
      };

      const response = await fetch('/api/chart-of-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      router.push('/dashboard/chart-of-accounts');
      router.refresh();
    } catch (err) {
      setError('An error occurred while creating the account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Account Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="code"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., 1010"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Cash"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Account Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
            <option value="EQUITY">Equity</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>

        <div>
          <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">
            Parent Account
          </label>
          <select
            id="parentId"
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">None (Root Account)</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
