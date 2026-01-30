import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { prisma } from '@accounting/db';
import DashboardLayout from '../../../../components/DashboardLayout';
import Link from 'next/link';
import CreateDebitVoucherForm from './CreateDebitVoucherForm';

export default async function ProjectDebitNewPage({
  params,
}: {
  params: { id: string };
}) {
  let auth;
  try {
    auth = await requirePermissionServer('vouchers', 'WRITE');
  } catch {
    redirect('/forbidden');
  }

  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      companyId: auth.companyId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) {
    redirect('/dashboard/projects');
  }

  return (
    <DashboardLayout
      title={`Create Debit Voucher - ${project.name}`}
      actions={
        <Link
          href={`/dashboard/debit?projectId=${params.id}`}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Debit List
        </Link>
      }
    >
      <CreateDebitVoucherForm projectId={params.id} projectName={project.name} />
    </DashboardLayout>
  );
}
