import { redirect } from 'next/navigation';
import { requireAuthServer } from '@/lib/rbac';
import { ensureSystemAccounts } from '@/lib/systemAccounts.server';
import DashboardLayout from './components/DashboardLayout';

export default async function DashboardPage() {
  let auth;
  try {
    auth = await requireAuthServer();
  } catch (error) {
    redirect('/login');
  }

  // Ensure system accounts exist for this company (idempotent)
  await ensureSystemAccounts(auth.companyId);

  const user = auth.user;

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.role}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Company ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{user.companyId}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <p className="text-sm text-gray-600">
            Use the sidebar navigation to access different sections of the application.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
