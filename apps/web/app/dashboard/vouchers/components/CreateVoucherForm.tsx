'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Project {
  id: string;
  name: string;
}

interface VoucherLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  projectId: string;
}

export default function CreateVoucherForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    narration: '',
    projectId: '',
  });

  const [lines, setLines] = useState<VoucherLine[]>([
    { accountId: '', description: '', debit: 0, credit: 0, projectId: '' },
    { accountId: '', description: '', debit: 0, credit: 0, projectId: '' },
  ]);

  useEffect(() => {
    // Fetch accounts
    fetch('/api/chart-of-accounts?active=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setAccounts(data.data);
        }
      });

    // Fetch projects
    fetch('/api/projects?active=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setProjects(data.data);
        }
      });
  }, []);

  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', debit: 0, credit: 0, projectId: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof VoucherLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const calculateTotals = () => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const { totalDebit, totalCredit, difference } = calculateTotals();
    if (Math.abs(difference) >= 0.01) {
      setError(`Voucher is not balanced. Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}, Difference: ${difference.toFixed(2)}`);
      return;
    }

    // Validate all lines have accounts
    if (lines.some((line) => !line.accountId)) {
      setError('All lines must have an account selected');
      return;
    }

    // Validate each line has either debit or credit
    if (lines.some((line) => line.debit === 0 && line.credit === 0)) {
      setError('Each line must have either debit or credit amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        date: formData.date,
        narration: formData.narration || null,
        projectId: formData.projectId || null,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description || null,
          debit: line.debit || 0,
          credit: line.credit || 0,
          projectId: line.projectId || null,
        })),
      };

      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to create voucher');
        return;
      }

      router.push('/dashboard/vouchers');
      router.refresh();
    } catch (err) {
      setError('An error occurred while creating the voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { totalDebit, totalCredit, difference } = calculateTotals();
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
            Project (Optional)
          </label>
          <select
            id="projectId"
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="narration" className="block text-sm font-medium text-gray-700">
            Narration
          </label>
          <textarea
            id="narration"
            value={formData.narration}
            onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Voucher Lines */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Voucher Lines</h3>
          <button
            type="button"
            onClick={addLine}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Add Line
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <select
                      required
                      value={line.accountId}
                      onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select Account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={line.projectId}
                      onChange={(e) => updateLine(index, 'projectId', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">None</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateLine(index, 'debit', value);
                        if (value > 0) updateLine(index, 'credit', 0);
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateLine(index, 'credit', value);
                        if (value > 0) updateLine(index, 'debit', 0);
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right font-medium">Totals:</td>
                <td className="px-4 py-2 text-right font-medium">
                  {totalDebit.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  {totalCredit.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {isBalanced ? '✓ Balanced' : `Diff: ${difference.toFixed(2)}`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
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
          disabled={isSubmitting || !isBalanced}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Voucher'}
        </button>
      </div>
    </form>
  );
}
