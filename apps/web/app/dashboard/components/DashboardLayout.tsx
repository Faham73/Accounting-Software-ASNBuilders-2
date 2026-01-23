import { ReactNode } from 'react';
import { requireAuthServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import Link from 'next/link';
import LogoutButton from '../logout-button';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}

export default async function DashboardLayout({
  children,
  title,
  actions,
}: DashboardLayoutProps) {
  const auth = await requireAuthServer();
  const role = auth.role;

  // Check permissions
  const canReadCompanies = can(role, 'companies', 'READ');
  const canReadProjects = can(role, 'projects', 'READ');
  const canReadVendors = can(role, 'vendors', 'READ');
  const canReadCostHeads = can(role, 'costHeads', 'READ');
  const canReadPaymentMethods = can(role, 'paymentMethods', 'READ');
  const canReadChartOfAccounts = can(role, 'chartOfAccounts', 'READ');
  const canReadVouchers = can(role, 'vouchers', 'READ');
  const canWriteProjects = can(role, 'projects', 'WRITE');
  const canWriteVendors = can(role, 'vendors', 'WRITE');
  const canWriteCostHeads = can(role, 'costHeads', 'WRITE');
  const canWritePaymentMethods = can(role, 'paymentMethods', 'WRITE');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h2>
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Dashboard
              </Link>
              {canReadCompanies && (
                <Link
                  href="/dashboard/companies"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Companies
                </Link>
              )}
              {canReadProjects && (
                <Link
                  href="/dashboard/projects"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Projects {canWriteProjects && '✏️'}
                </Link>
              )}
              {canReadVendors && (
                <Link
                  href="/dashboard/vendors"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Vendors {canWriteVendors && '✏️'}
                </Link>
              )}
              {canReadCostHeads && (
                <Link
                  href="/dashboard/cost-heads"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cost Heads {canWriteCostHeads && '✏️'}
                </Link>
              )}
              {canReadPaymentMethods && (
                <Link
                  href="/dashboard/payment-methods"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Payment Methods {canWritePaymentMethods && '✏️'}
                </Link>
              )}
              {canReadChartOfAccounts && (
                <Link
                  href="/dashboard/chart-of-accounts"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Chart of Accounts
                </Link>
              )}
              {canReadVouchers && (
                <Link
                  href="/dashboard/vouchers"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Vouchers
                </Link>
              )}
            </nav>
          </div>
          <div className="p-4 border-t border-gray-200">
            <LogoutButton />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                <div className="flex gap-4 items-center">
                  {actions}
                  <Link
                    href="/dashboard"
                    className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
