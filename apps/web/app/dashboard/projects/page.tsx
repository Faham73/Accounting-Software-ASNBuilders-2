import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import { prisma } from '@accounting/db';
import DashboardLayout from '../components/DashboardLayout';
import ProjectsList from './components/ProjectsList';
import Link from 'next/link';

export default async function ProjectsPage() {
  let auth;
  try {
    auth = await requirePermissionServer('projects', 'READ');
  } catch (error) {
    redirect('/forbidden');
  }

  const canWrite = can(auth.role, 'projects', 'WRITE');

  // Fetch initial projects
  const projects = await prisma.project.findMany({
    where: {
      companyId: auth.companyId,
      isActive: true, // Default to active only
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientContact: true,
      siteLocation: true,
      startDate: true,
      expectedEndDate: true,
      contractValue: true,
      status: true,
      assignedManager: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <DashboardLayout
      title="Projects"
      actions={
        canWrite ? (
          <Link
            href="/dashboard/projects/new"
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            New Project
          </Link>
        ) : null
      }
    >
      <ProjectsList initialProjects={projects as any} canWrite={canWrite} />
    </DashboardLayout>
  );
}
