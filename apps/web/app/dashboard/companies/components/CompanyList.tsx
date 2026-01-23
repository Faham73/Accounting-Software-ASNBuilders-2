'use client';

import { useState } from 'react';
import { Company } from './types';

interface CompanyListProps {
  companies: Company[];
  onUpdate: () => void;
}

export default function CompanyList({ companies, onUpdate }: CompanyListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setEditName(company.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setError(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setError('Company name is required');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to update company');
        return;
      }

      setEditingId(null);
      setEditName('');
      onUpdate();
    } catch (err) {
      setError('An error occurred while updating the company');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Companies</h2>
      {companies.length === 0 ? (
        <p className="text-gray-500">No companies found. Create one to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === company.id ? (
                      <div>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          disabled={isUpdating}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveEdit(company.id);
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          autoFocus
                        />
                        {error && editingId === company.id && (
                          <p className="mt-1 text-sm text-red-600">{error}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        company.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === company.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(company.id)}
                          disabled={isUpdating}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isUpdating}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(company)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    )}
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
