import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import DashboardLayout from '../components/DashboardLayout';
import DebitClient from './DebitClient';

export default async function DebitPage() {
  let auth;
  try {
    auth = await requirePermissionServer('vouchers', 'READ');
  } catch (error) {
    redirect('/forbidden');
  }

  return (
    <DashboardLayout title="Total Debit">
      <DebitClient />
    </DashboardLayout>
  );
}
