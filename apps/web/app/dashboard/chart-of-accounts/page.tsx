import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import { prisma } from '@accounting/db';
import DashboardLayout from '../components/DashboardLayout';
import ChartOfAccountsList from './components/ChartOfAccountsList';
import Link from 'next/link';

export default async function ChartOfAccountsPage() {
  let auth;
  try {
    auth = await requirePermissionServer('chartOfAccounts', 'READ');
  } catch (error) {
    redirect('/forbidden');
  }

  const canWrite = can(auth.role, 'chartOfAccounts', 'WRITE');

  // Fetch accounts
  const accounts = await prisma.account.findMany({
    where: {
      companyId: auth.companyId,
      isActive: true,
    },
    orderBy: [{ code: 'asc' }],
    include: {
      parent: {
        select: { id: true, code: true, name: true },
      },
      children: {
        select: { id: true },
      },
      _count: {
        select: { voucherLines: true },
      },
    },
  });

  return (
    <DashboardLayout
      title="Chart of Accounts"
      actions={
        canWrite ? (
          <Link
            href="/dashboard/chart-of-accounts/new"
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            New Account
          </Link>
        ) : null
      }
    >
      <ChartOfAccountsList initialAccounts={accounts as any} canWrite={canWrite} />
    </DashboardLayout>
  );
}
