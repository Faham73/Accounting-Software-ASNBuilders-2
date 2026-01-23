'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '../../components/types';
import Link from 'next/link';

interface ProjectsListProps {
  initialProjects: Project[];
  canWrite: boolean;
}

export default function ProjectsList({ initialProjects, canWrite }: ProjectsListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (activeFilter !== null) params.append('active', activeFilter.toString());

      const response = await fetch(`/api/projects?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProjects();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter, activeFilter]);

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this project?')) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.ok) {
        fetchProjects();
      } else {
        alert(data.error || 'Failed to archive project');
      }
    } catch (error) {
      alert('An error occurred while archiving the project');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 space-y-4 md:flex md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div>
          <select
            value={activeFilter === null ? 'all' : activeFilter.toString()}
            onChange={(e) => {
              const value = e.target.value;
              setActiveFilter(value === 'all' ? null : value === 'true');
            }}
            className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="true">Active</option>
            <option value="false">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No projects found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    {project.siteLocation && (
                      <div className="text-sm text-gray-500">{project.siteLocation}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{project.clientName || '-'}</div>
                    {project.clientContact && (
                      <div className="text-sm text-gray-500">{project.clientContact}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.contractValue
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(Number(project.contractValue))
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        project.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.isActive ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {canWrite && (
                      <>
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleArchive(project.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Archive
                        </button>
                      </>
                    )}
                    {!canWrite && <span className="text-gray-400">View Only</span>}
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
