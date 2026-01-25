import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import DashboardLayout from '../components/DashboardLayout';
import Link from 'next/link';
import ProductsList from './components/ProductsList';

export default async function ProductsPage() {
  let auth;
  try {
    auth = await requirePermissionServer('products', 'READ');
  } catch {
    redirect('/forbidden');
  }

  const canWrite = can(auth.role, 'products', 'WRITE');

  return (
    <DashboardLayout
      title="Products"
      actions={
        canWrite ? (
          <Link
            href="/dashboard/products/new"
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            New Product
          </Link>
        ) : null
      }
    >
      <ProductsList canWrite={canWrite} />
    </DashboardLayout>
  );
}
