import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { prisma } from '@accounting/db';
import DashboardLayout from '../../components/DashboardLayout';
import ProjectDashboardClient from './components/ProjectDashboardClient';
import ProjectStatementActions from './components/ProjectStatementActions';
import Link from 'next/link';

export default async function ProjectViewPage({
  params,
}: {
  params: { id: string };
}) {
  let auth;
  try {
    auth = await requirePermissionServer('projects', 'READ');
  } catch (error) {
    redirect('/forbidden');
  }

  // Fetch project and verify it belongs to user's company
  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      companyId: auth.companyId,
    },
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
    },
  });

  if (!project) {
    redirect('/dashboard/projects');
  }

  return (
    <DashboardLayout
      title={`Project: ${project.name}`}
      actions={
        <div className="flex gap-2 flex-wrap items-center">
          <Link
            href={`/dashboard/projects/${params.id}/edit`}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Edit Project
          </Link>
          <Link
            href={`/dashboard/projects/${params.id}/ledger`}
            className="py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            View Ledger
          </Link>
          <Link
            href={`/dashboard/projects/${params.id}/cost-summary`}
            className="py-2 px-4 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
          >
            Cost Summary
          </Link>
          <ProjectStatementActions projectId={params.id} projectName={project.name} />
        </div>
      }
    >
      <ProjectDashboardClient projectId={params.id} projectName={project.name} />
    </DashboardLayout>
  );
}
