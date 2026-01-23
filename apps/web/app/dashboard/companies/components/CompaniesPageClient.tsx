'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CompanyList from './CompanyList';
import CreateCompanyForm from './CreateCompanyForm';
import { Company } from './types';

interface CompaniesPageClientProps {
  initialCompanies: Company[];
}

export default function CompaniesPageClient({ initialCompanies }: CompaniesPageClientProps) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const router = useRouter();

  const refreshCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();

      if (data.ok) {
        setCompanies(data.data);
      } else {
        // If unauthorized/forbidden, redirect
        if (data.error?.includes('Admin') || data.error?.includes('Unauthorized')) {
          router.push('/forbidden');
        }
      }
    } catch (error) {
      console.error('Failed to refresh companies:', error);
    }
  }, [router]);

  return (
    <div>
      <CreateCompanyForm onSuccess={refreshCompanies} />
      <div className="mt-8 border-t border-gray-200 pt-6">
        <CompanyList companies={companies} onUpdate={refreshCompanies} />
      </div>
    </div>
  );
}
