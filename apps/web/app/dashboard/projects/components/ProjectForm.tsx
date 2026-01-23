'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '../../components/types';
import AttachmentUploader from './AttachmentUploader';

interface ProjectFormProps {
  project?: Project;
  onDuplicate?: () => void;
}

export default function ProjectForm({ project, onDuplicate }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: project?.name || '',
    clientName: project?.clientName || '',
    clientContact: project?.clientContact || '',
    siteLocation: project?.siteLocation || '',
    startDate: project?.startDate ? project.startDate.split('T')[0] : '',
    expectedEndDate: project?.expectedEndDate ? project.expectedEndDate.split('T')[0] : '',
    contractValue: project?.contractValue?.toString() || '',
    status: project?.status || 'DRAFT',
    assignedManager: project?.assignedManager || '',
    isActive: project?.isActive ?? true,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        clientName: formData.clientName || null,
        clientContact: formData.clientContact || null,
        siteLocation: formData.siteLocation || null,
        startDate: formData.startDate || null,
        expectedEndDate: formData.expectedEndDate || null,
        contractValue: formData.contractValue ? parseFloat(formData.contractValue) : null,
        status: formData.status,
        assignedManager: formData.assignedManager || null,
        isActive: formData.isActive,
      };

      const url = project ? `/api/projects/${project.id}` : '/api/projects';
      const method = project ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to save project');
        return;
      }

      router.push('/dashboard/projects');
      router.refresh();
    } catch (err) {
      setError('An error occurred while saving the project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="DRAFT">Draft</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
            Client Name
          </label>
          <input
            type="text"
            id="clientName"
            value={formData.clientName}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="clientContact" className="block text-sm font-medium text-gray-700">
            Client Contact
          </label>
          <input
            type="text"
            id="clientContact"
            value={formData.clientContact}
            onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="siteLocation" className="block text-sm font-medium text-gray-700">
            Site Location
          </label>
          <input
            type="text"
            id="siteLocation"
            value={formData.siteLocation}
            onChange={(e) => setFormData({ ...formData, siteLocation: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="assignedManager" className="block text-sm font-medium text-gray-700">
            Assigned Manager
          </label>
          <input
            type="text"
            id="assignedManager"
            value={formData.assignedManager}
            onChange={(e) => setFormData({ ...formData, assignedManager: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="expectedEndDate" className="block text-sm font-medium text-gray-700">
            Expected End Date
          </label>
          <input
            type="date"
            id="expectedEndDate"
            value={formData.expectedEndDate}
            onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="contractValue" className="block text-sm font-medium text-gray-700">
            Contract Value
          </label>
          <input
            type="number"
            id="contractValue"
            step="0.01"
            min="0"
            value={formData.contractValue}
            onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Active
          </label>
        </div>
      </div>

      {/* Attachments section - only show on edit page */}
      {project && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Attachments</h3>
          <AttachmentUploader projectId={project.id} />
        </div>
      )}

      <div className="flex justify-end space-x-4">
        {onDuplicate && (
          <button
            type="button"
            onClick={onDuplicate}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Duplicate Last Project
          </button>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  );
}
