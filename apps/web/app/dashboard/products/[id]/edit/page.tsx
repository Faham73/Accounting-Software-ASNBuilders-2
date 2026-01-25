import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { prisma } from '@accounting/db';
import DashboardLayout from '../../../components/DashboardLayout';
import ProductForm from '../../components/ProductForm';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  let auth;
  try {
    auth = await requirePermissionServer('products', 'WRITE');
  } catch {
    redirect('/forbidden');
  }

  const product = await prisma.product.findUnique({
    where: {
      id: params.id,
      companyId: auth.companyId,
    },
  });

  if (!product) {
    redirect('/dashboard/products');
  }

  // Convert Prisma Decimal to number for form
  const productData = {
    ...product,
    defaultPurchasePrice: Number(product.defaultPurchasePrice),
    defaultSalePrice: Number(product.defaultSalePrice),
    openingStockQty: Number(product.openingStockQty),
    openingStockUnitCost: Number(product.openingStockUnitCost),
  };

  return (
    <DashboardLayout title="Edit Product">
      <ProductForm product={productData as any} />
    </DashboardLayout>
  );
}
