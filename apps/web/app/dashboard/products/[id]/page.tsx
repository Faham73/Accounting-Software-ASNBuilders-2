import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import { prisma } from '@accounting/db';
import DashboardLayout from '../../components/DashboardLayout';
import Link from 'next/link';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  let auth;
  try {
    auth = await requirePermissionServer('products', 'READ');
  } catch {
    redirect('/forbidden');
  }

  const product = await prisma.product.findUnique({
    where: {
      id: params.id,
      companyId: auth.companyId,
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
      inventoryAccount: {
        select: { id: true, code: true, name: true, type: true },
      },
    },
  });

  if (!product) {
    redirect('/dashboard/products');
  }

  // Calculate stock
  const inventorySum = await prisma.inventoryTxn.aggregate({
    where: {
      companyId: auth.companyId,
      productId: product.id,
    },
    _sum: {
      qtyIn: true,
      qtyOut: true,
    },
  });

  const qtyIn = Number(inventorySum._sum.qtyIn || 0);
  const qtyOut = Number(inventorySum._sum.qtyOut || 0);
  const stock = Number(product.openingStockQty) + qtyIn - qtyOut;

  const canWrite = can(auth.role, 'products', 'WRITE');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <DashboardLayout
      title="Product Details"
      actions={
        canWrite ? (
          <Link
            href={`/dashboard/products/${product.id}/edit`}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Edit
          </Link>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* Product Image */}
        {product.imageUrl && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Product Image</h2>
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-48 w-48 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-product.png';
              }}
            />
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Product Code</label>
              <p className="mt-1 text-sm text-gray-900">{product.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Product Name</label>
              <p className="mt-1 text-sm text-gray-900">{product.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Unit</label>
              <p className="mt-1 text-sm text-gray-900">{product.unit}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <p className="mt-1 text-sm text-gray-900">{product.category?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Company/Warehouse</label>
              <p className="mt-1 text-sm text-gray-900">Company</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {product.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Pricing Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Default Purchase Price</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(Number(product.defaultPurchasePrice))}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Default Sale Price</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(Number(product.defaultSalePrice))}
              </p>
            </div>
          </div>
        </div>

        {/* Inventory Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Inventory Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Is Inventory</label>
              <p className="mt-1 text-sm text-gray-900">{product.isInventory ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Opening Stock Quantity</label>
              <p className="mt-1 text-sm text-gray-900">
                {Number(product.openingStockQty).toFixed(3)} {product.unit}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Opening Stock Unit Cost</label>
              <p className="mt-1 text-sm text-gray-900">
                {formatCurrency(Number(product.openingStockUnitCost))}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current Stock</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {stock.toFixed(3)} {product.unit}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Inventory Account</label>
              <p className="mt-1 text-sm text-gray-900">
                {product.inventoryAccount
                  ? `${product.inventoryAccount.code} - ${product.inventoryAccount.name} (${product.inventoryAccount.type})`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
