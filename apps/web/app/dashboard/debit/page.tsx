import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import { can } from '@/lib/permissions';
import DashboardLayout from '../components/DashboardLayout';
import DebitClient from './DebitClient';
import Link from 'next/link';

export default async function DebitPage() {
  let auth;
  try {
    auth = await requirePermissionServer('vouchers', 'READ');
  } catch (error) {
    redirect('/forbidden');
  }

  const canWrite = can(auth.role, 'vouchers', 'WRITE');

  return (
    <DashboardLayout
      title="Total Debit"
      actions={
        canWrite ? (
          <Link
            href="/dashboard/vouchers/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + Add Debit
          </Link>
        ) : null
      }
    >
      <DebitClient />
    </DashboardLayout>
  );
}
