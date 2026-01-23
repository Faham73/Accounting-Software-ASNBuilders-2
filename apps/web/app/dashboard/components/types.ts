export interface Project {
  id: string;
  name: string;
  clientName?: string | null;
  clientContact?: string | null;
  siteLocation?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  contractValue?: number | null;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'CLOSED';
  assignedManager?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostHead {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CHEQUE' | 'MOBILE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
