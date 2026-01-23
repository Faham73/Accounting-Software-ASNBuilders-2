import { redirect } from 'next/navigation';
import { requirePermissionServer } from '@/lib/rbac';
import DashboardLayout from '../components/DashboardLayout';
import Link from 'next/link';

export default async function ReportsPage() {
  let auth;
  try {
    auth = await requirePermissionServer('vouchers', 'READ');
  } catch (error) {
    redirect('/forbidden');
  }

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Payables Report Card */}
          <Link
            href="/dashboard/reports/payables"
            className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Payables Report</h3>
                <p className="text-sm text-gray-600">View vendor balances and outstanding payables</p>
              </div>
              <div className="text-blue-600">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
