import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import DashboardLayout from '../../components/DashboardLayout';
import Link from 'next/link';
import { prisma } from '@accounting/db';

export default async function WarehouseDetailPage({ params }: { params: { id: string } }) {
  let auth;
  try {
    auth = await requirePermissionServer('warehouses', 'READ');
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

  const canWrite = can(auth.role, 'warehouses', 'WRITE');

  return (
    <DashboardLayout
      title={`Warehouse: ${warehouse.name}`}
      actions={
        canWrite ? (
          <Link
            href={`/dashboard/warehouses/${warehouse.id}/edit`}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Edit
          </Link>
        ) : null
      }
    >
      <div className="bg-white shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{warehouse.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{warehouse.type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                warehouse.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(warehouse.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </DashboardLayout>
  );
}
