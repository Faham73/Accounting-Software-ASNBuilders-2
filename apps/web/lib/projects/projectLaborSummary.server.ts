import { prisma } from '@accounting/db';

export interface ProjectLaborSummary {
  workersToday: number;
  dailyCost: number;
  monthlyCost: number;
  pendingWages: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Labor totals by type (DAY / MONTHLY), workers today count, and pending wages (0 if no wages system).
 */
export async function getProjectLaborSummary(
  projectId: string,
  companyId: string
): Promise<ProjectLaborSummary> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });

  if (!project) {
    throw new Error('Project not found or does not belong to company');
  }

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [dayAgg, monthlyAgg, workersTodayCount] = await Promise.all([
    prisma.projectLabor.aggregate({
      where: { projectId, companyId, type: 'DAY' },
      _sum: { amount: true },
    }),
    prisma.projectLabor.aggregate({
      where: { projectId, companyId, type: 'MONTHLY' },
      _sum: { amount: true },
    }),
    prisma.projectLabor.count({
      where: {
        projectId,
        companyId,
        type: 'DAY',
        date: { gte: todayStart, lte: todayEnd },
      },
    }),
  ]);

  return {
    workersToday: workersTodayCount,
    dailyCost: dayAgg._sum.amount?.toNumber() ?? 0,
    monthlyCost: monthlyAgg._sum.amount?.toNumber() ?? 0,
    pendingWages: 0,
  };
}
