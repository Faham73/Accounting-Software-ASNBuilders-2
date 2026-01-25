import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import DashboardLayout from '../../components/DashboardLayout';
import WarehouseForm from '../components/WarehouseForm';

export default async function NewWarehousePage() {
  try {
    await requirePermissionServer('warehouses', 'WRITE');
  } catch {
    redirect('/forbidden');
  }

  return (
    <DashboardLayout title="New Warehouse">
      <WarehouseForm />
    </DashboardLayout>
  );
}
