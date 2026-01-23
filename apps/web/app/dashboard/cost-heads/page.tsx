import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import { prisma } from '@accounting/db';
import DashboardLayout from '../components/DashboardLayout';
import CostHeadsList from './components/CostHeadsList';

export default async function CostHeadsPage() {
  let auth;
  try {
    auth = await requirePermissionServer('costHeads', 'READ');
  } catch (error) {
    redirect('/forbidden');
  }

  const canWrite = can(auth.role, 'costHeads', 'WRITE');

  const costHeads = await prisma.costHead.findMany({
    where: {
      companyId: auth.companyId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <DashboardLayout title="Cost Heads">
      <CostHeadsList initialCostHeads={costHeads as any} canWrite={canWrite} />
    </DashboardLayout>
  );
}
