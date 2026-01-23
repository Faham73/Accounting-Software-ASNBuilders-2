'use client';

import { useState } from 'react';

interface CreateCompanyFormProps {
  onSuccess: () => void;
}

export default function CreateCompanyForm({ onSuccess }: CreateCompanyFormProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Company name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to create company');
        return;
      }

      // Reset form and refresh list
      setName('');
      onSuccess();
    } catch (err) {
      setError('An error occurred while creating the company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Company</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter company name"
            disabled={isSubmitting}
            required
          />
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  );
}
