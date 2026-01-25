import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import DashboardLayout from '../../components/DashboardLayout';
import ProductForm from '../components/ProductForm';

export default async function NewProductPage() {
  try {
    await requirePermissionServer('products', 'WRITE');
  } catch {
    redirect('/forbidden');
  }

  return (
    <DashboardLayout title="New Product">
      <ProductForm />
    </DashboardLayout>
  );
}
