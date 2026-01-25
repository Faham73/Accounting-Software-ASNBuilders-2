import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import DashboardLayout from '../components/DashboardLayout';
import Link from 'next/link';
import WarehousesList from './components/WarehousesList';

export default async function WarehousesPage() {
  let auth;
  try {
    auth = await requirePermissionServer('warehouses', 'READ');
  } catch {
    redirect('/forbidden');
  }

  const canWrite = can(auth.role, 'warehouses', 'WRITE');

  return (
    <DashboardLayout
      title="Warehouses"
      actions={
        canWrite ? (
          <Link
            href="/dashboard/warehouses/new"
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            New Warehouse
          </Link>
        ) : null
      }
    >
      <WarehousesList canWrite={canWrite} />
    </DashboardLayout>
  );
}
