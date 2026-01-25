import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import DashboardLayout from '../../../components/DashboardLayout';
import WarehouseForm from '../../components/WarehouseForm';
import { prisma } from '@accounting/db';

export default async function EditWarehousePage({ params }: { params: { id: string } }) {
  let auth;
  try {
    auth = await requirePermissionServer('warehouses', 'WRITE');
  } catch {
    redirect('/forbidden');
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: params.id,
      companyId: auth.companyId,
    },
  });

  if (!warehouse) {
    redirect('/dashboard/warehouses');
  }

  return (
    <DashboardLayout title={`Edit Warehouse: ${warehouse.name}`}>
      <WarehouseForm warehouse={warehouse} />
    </DashboardLayout>
  );
}
