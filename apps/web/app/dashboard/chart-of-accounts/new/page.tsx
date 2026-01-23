import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import DashboardLayout from '../../components/DashboardLayout';
import CreateAccountForm from '../components/CreateAccountForm';

export default async function NewAccountPage() {
  let auth;
  try {
    auth = await requirePermissionServer('chartOfAccounts', 'WRITE');
  } catch (error) {
    redirect('/forbidden');
  }

  return (
    <DashboardLayout title="New Account">
      <CreateAccountForm />
    </DashboardLayout>
  );
}
