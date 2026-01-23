import { redirect } from 'next/navigation';
import { requireAdminServer } from '@/lib/rbac';
import { prisma } from '@accounting/db';
import DashboardLayout from '../components/DashboardLayout';
import CompaniesPageClient from './components/CompaniesPageClient';

export default async function CompaniesPage() {
  try {
    await requireAdminServer();
  } catch (error) {
    redirect('/forbidden');
  }

  // Fetch companies server-side
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <DashboardLayout title="Companies">
      <CompaniesPageClient initialCompanies={companies} />
    </DashboardLayout>
  );
}
