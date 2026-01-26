/**
 * Comprehensive seed script for accounting app.
 * Idempotent: safe to re-run. Uses upserts / findFirst+create.
 *
 * Run: npx prisma db seed
 * Or:  npm run db:seed (from root) / npm run db:seed (from packages/db)
 */

import {
  PrismaClient,
  UserRole,
  PaymentMethodType,
  AccountType,
  ProjectCostCategory,
  ProjectStatus,
  VoucherType,
  VoucherStatus,
  ExpenseType,
  OverheadAllocationMethod,
  ExpenseSource,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

faker.seed(1234);

const PASSWORD = 'password123';
let passwordHash: string;

// Bangladeshi-style vendor names (deterministic with faker seed)
const BANGLADESHI_NAMES = [
  'Abdul Karim Traders',
  'Rahim Steel & Hardware',
  'Fatema Construction Supplies',
  'Hassan Cement Ltd',
  'Jahanara Building Materials',
  'Mannan Brick Works',
  'Nazma Electric & Plumbing',
  'Sultan Timber Mart',
  'Habib Sand & Stone',
  'Shirin Paint House',
];

const COMPANY_NAMES = ['ASN Builders', 'Demo Construction Ltd'] as const;

interface SeedContext {
  companyId: string;
  userIds: string[];
  projectIds: { main: string; subs: string[] };
  vendorIds: string[];
  costHeadIds: string[];
  paymentMethodIds: string[];
  accountIdsByCode: Record<string, string>;
  voucherNos: Set<string>;
  expenseCategoryIds: string[];
}

async function getOrCreateCompany(name: string) {
  let company = await prisma.company.findFirst({ where: { name } });
  if (!company) {
    company = await prisma.company.create({ data: { name, isActive: true } });
  }
  return company;
}

function nextVoucherNo(ctx: SeedContext, prefix: string): string {
  let n = 1;
  let no: string;
  do {
    no = `${prefix}-${String(n).padStart(4, '0')}`;
    n++;
  } while (ctx.voucherNos.has(no));
  ctx.voucherNos.add(no);
  return no;
}

async function seedCompany(name: string): Promise<SeedContext> {
  const company = await getOrCreateCompany(name);
  const ctx: SeedContext = {
    companyId: company.id,
    userIds: [],
    projectIds: { main: '', subs: [] },
    vendorIds: [],
    costHeadIds: [],
    paymentMethodIds: [],
    accountIdsByCode: {},
    voucherNos: new Set(),
    expenseCategoryIds: [],
  };

  const slug = name.replace(/\s+/g, '').toLowerCase().slice(0, 8);
  const roles: UserRole[] = [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.ENGINEER, UserRole.DATA_ENTRY, UserRole.VIEWER, UserRole.DATA_ENTRY];
  const roleNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Admin',
    [UserRole.ACCOUNTANT]: 'Accountant',
    [UserRole.ENGINEER]: 'Engineer',
    [UserRole.DATA_ENTRY]: 'Data Entry',
    [UserRole.VIEWER]: 'Viewer',
  };

  for (let i = 0; i < 6; i++) {
    const role = roles[i];
    const email = `${slug}-${role.toLowerCase().replace(/\s+/, '')}-${i + 1}@example.com`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `${roleNames[role]} ${i + 1}`,
        passwordHash,
        role,
        companyId: company.id,
        isActive: true,
      },
    });
    ctx.userIds.push(u.id);
  }

  let main = await prisma.project.findFirst({
    where: { companyId: company.id, isMain: true, name: { contains: 'Main' } },
  });
  if (!main) {
    main = await prisma.project.create({
      data: {
        companyId: company.id,
        name: `${name} – Main Project`,
        clientName: 'Demo Client Ltd',
        clientContact: '+880 1XXX-XXXXXX',
        siteLocation: faker.location.streetAddress(),
        startDate: faker.date.past({ years: 1 }),
        expectedEndDate: faker.date.future({ years: 1 }),
        contractValue: 5_000_000,
        status: ProjectStatus.RUNNING,
        projectManager: 'Kamal Hossain',
        projectEngineer: 'Rupa Akter',
        isMain: true,
        isActive: true,
      },
    });
  }
  const mainId = main.id;
  ctx.projectIds.main = mainId;

  const subNames = ['Block A', 'Block B', 'Site Office'];
  const existingSubs = await prisma.project.findMany({
    where: { companyId: company.id, parentProjectId: mainId },
  });
  for (let i = 0; i < subNames.length; i++) {
    if (existingSubs[i]) {
      ctx.projectIds.subs.push(existingSubs[i].id);
      continue;
    }
    const sp = await prisma.project.create({
      data: {
        companyId: company.id,
        name: `${name} – ${subNames[i]}`,
        clientName: 'Demo Client Ltd',
        siteLocation: faker.location.streetAddress(),
        startDate: faker.date.past({ years: 1 }),
        expectedEndDate: faker.date.future({ years: 1 }),
        contractValue: 500_000 + faker.number.int({ min: 0, max: 200_000 }),
        status: ProjectStatus.RUNNING,
        projectManager: 'Site Manager',
        projectEngineer: 'Site Engineer',
        isMain: false,
        parentProjectId: mainId,
        isActive: true,
      },
    });
    ctx.projectIds.subs.push(sp.id);
  }

  for (let i = 0; i < 10; i++) {
    let v = await prisma.vendor.findFirst({
      where: { companyId: company.id, name: BANGLADESHI_NAMES[i] },
    });
    if (!v) {
      v = await prisma.vendor.create({
        data: {
          companyId: company.id,
          name: BANGLADESHI_NAMES[i],
          phone: `+880 1${faker.string.numeric(9)}`,
          address: faker.location.streetAddress() + ', Dhaka',
          isActive: true,
        },
      });
    }
    ctx.vendorIds.push(v.id);
  }

  const costHeads: { name: string; code: string; category: ProjectCostCategory }[] = [
    { name: 'Cement', code: 'CH01', category: ProjectCostCategory.MATERIALS },
    { name: 'Steel', code: 'CH02', category: ProjectCostCategory.MATERIALS },
    { name: 'Bricks', code: 'CH03', category: ProjectCostCategory.MATERIALS },
    { name: 'Sand', code: 'CH04', category: ProjectCostCategory.MATERIALS },
    { name: 'Labor – Civil', code: 'CH05', category: ProjectCostCategory.CIVIL },
    { name: 'Labor – Mason', code: 'CH06', category: ProjectCostCategory.CIVIL },
    { name: 'Matí Kata', code: 'CH07', category: ProjectCostCategory.MATI_KATA },
    { name: 'Dhalai', code: 'CH08', category: ProjectCostCategory.DHALAI },
    { name: 'Transport', code: 'CH09', category: ProjectCostCategory.OTHERS },
    { name: 'Equipment', code: 'CH10', category: ProjectCostCategory.OTHERS },
    { name: 'Electrical', code: 'CH11', category: ProjectCostCategory.OTHERS },
    { name: 'Plumbing', code: 'CH12', category: ProjectCostCategory.OTHERS },
  ];

  for (const ch of costHeads) {
    const c = await prisma.costHead.upsert({
      where: { companyId_name: { companyId: company.id, name: ch.name } },
      update: {},
      create: { companyId: company.id, name: ch.name, code: ch.code, isActive: true },
    });
    ctx.costHeadIds.push(c.id);
    await prisma.projectCostCategoryMap.upsert({
      where: { companyId_costHeadId: { companyId: company.id, costHeadId: c.id } },
      update: { category: ch.category },
      create: { companyId: company.id, costHeadId: c.id, category: ch.category, isActive: true },
    });
  }

  const paymentMethods: { name: string; type: PaymentMethodType }[] = [
    { name: 'Cash', type: PaymentMethodType.CASH },
    { name: 'Bank-DBBL', type: PaymentMethodType.BANK },
    { name: 'Bank-Islami', type: PaymentMethodType.BANK },
    { name: 'Cheque', type: PaymentMethodType.CHEQUE },
    { name: 'bKash', type: PaymentMethodType.MOBILE },
  ];
  for (const pm of paymentMethods) {
    const p = await prisma.paymentMethod.upsert({
      where: { companyId_name: { companyId: company.id, name: pm.name } },
      update: {},
      create: { companyId: company.id, name: pm.name, type: pm.type, isActive: true },
    });
    ctx.paymentMethodIds.push(p.id);
  }

  type AccountDef = { code: string; name: string; type: AccountType; parentCode?: string };
  const accounts: AccountDef[] = [
    { code: '1000', name: 'Assets', type: AccountType.ASSET },
    { code: '1010', name: 'Cash', type: AccountType.ASSET, parentCode: '1000' },
    { code: '1020', name: 'Bank', type: AccountType.ASSET, parentCode: '1000' },
    { code: '1030', name: 'Accounts Receivable', type: AccountType.ASSET, parentCode: '1000' },
    { code: '1040', name: 'Equipment', type: AccountType.ASSET, parentCode: '1000' },
    { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY },
    { code: '2010', name: 'Accounts Payable', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '2020', name: 'Advance from Client', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '3000', name: 'Equity', type: AccountType.EQUITY },
    { code: '3010', name: 'Retained Earnings', type: AccountType.EQUITY, parentCode: '3000' },
    { code: '3020', name: 'Capital', type: AccountType.EQUITY, parentCode: '3000' },
    { code: '4000', name: 'Income', type: AccountType.INCOME },
    { code: '4010', name: 'Contract Revenue', type: AccountType.INCOME, parentCode: '4000' },
    { code: '5000', name: 'Expenses', type: AccountType.EXPENSE },
    { code: '5010', name: 'Direct Materials', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5020', name: 'Direct Labor', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5030', name: 'Site Overhead', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5040', name: 'Office Rent', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5050', name: 'Utilities', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5060', name: 'Fuel', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5070', name: 'Equipment Rental', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5090', name: 'Misc Expense', type: AccountType.EXPENSE, parentCode: '5000' },
  ];

  for (const a of accounts) {
    const parentId = a.parentCode ? (ctx.accountIdsByCode[a.parentCode] ?? null) : null;
    const acc = await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code: a.code } },
      update: { parentId: parentId ?? undefined },
      create: {
        companyId: company.id,
        code: a.code,
        name: a.name,
        type: a.type,
        parentId,
        isActive: true,
      },
    });
    ctx.accountIdsByCode[a.code] = acc.id;
  }

  const allProjectIds = [ctx.projectIds.main, ...ctx.projectIds.subs];
  const getAccount = (code: string) => ctx.accountIdsByCode[code];
  const creator = () => faker.helpers.arrayElement(ctx.userIds);
  const pickProject = () => (faker.number.float({ min: 0, max: 1 }) < 0.6 ? faker.helpers.arrayElement(allProjectIds) : null);
  const pickVendor = () => faker.helpers.arrayElement(ctx.vendorIds);
  const pickCostHead = () => faker.helpers.arrayElement(ctx.costHeadIds);
  const pickPaymentMethod = () => faker.helpers.arrayElement(ctx.paymentMethodIds);

  const existingVouchers = await prisma.voucher.findMany({
    where: { companyId: company.id },
    select: { voucherNo: true },
  });
  existingVouchers.forEach((v) => ctx.voucherNos.add(v.voucherNo));

  const now = new Date();
  const past90 = new Date(now);
  past90.setDate(past90.getDate() - 90);

  const journalApCreditLines: { id: string; vendorId: string; amount: number }[] = [];
  const paymentVouchersWithVendor: { voucherId: string; vendorId: string; amount: number }[] = [];
  const vouchersToCreate = Math.max(0, 30 - existingVouchers.length);
  if (vouchersToCreate === 0) {
    // Skip voucher creation; we may still need to create allocations if we have payment vouchers and source lines
  }

  for (let i = 0; i < vouchersToCreate; i++) {
    const date = faker.date.between({ from: past90, to: now });
    const type = faker.helpers.arrayElement([VoucherType.JOURNAL, VoucherType.PAYMENT, VoucherType.RECEIPT, VoucherType.CONTRA]);
    const expenseType = faker.helpers.arrayElement([ExpenseType.PROJECT_EXPENSE, ExpenseType.OFFICE_EXPENSE]);
    const projectId = expenseType === ExpenseType.PROJECT_EXPENSE ? pickProject() : null;
    const status = faker.helpers.arrayElement([VoucherStatus.DRAFT, VoucherStatus.SUBMITTED, VoucherStatus.APPROVED, VoucherStatus.POSTED]);
    const voucherNo = nextVoucherNo(ctx, type === VoucherType.JOURNAL ? 'JV' : type === VoucherType.PAYMENT ? 'PV' : type === VoucherType.RECEIPT ? 'RV' : 'CV');

    const createdBy = creator();
    let submittedById: string | null = null;
    let approvedById: string | null = null;
    let postedById: string | null = null;
    let submittedAt: Date | null = null;
    let approvedAt: Date | null = null;
    let postedAt: Date | null = null;
    if (status !== VoucherStatus.DRAFT) {
      submittedById = createdBy;
      submittedAt = new Date(date.getTime() + 60_000);
      if (status !== VoucherStatus.SUBMITTED) {
        approvedById = ctx.userIds[0];
        approvedAt = new Date(date.getTime() + 120_000);
        if (status === VoucherStatus.POSTED) {
          postedById = ctx.userIds[0];
          postedAt = new Date(date.getTime() + 180_000);
        }
      }
    }

    const voucher = await prisma.voucher.create({
      data: {
        companyId: company.id,
        projectId,
        voucherNo,
        type,
        expenseType,
        date,
        status,
        narration: faker.lorem.sentence(),
        createdByUserId: createdBy,
        submittedById,
        submittedAt,
        approvedById,
        approvedAt,
        postedByUserId: postedById,
        postedAt,
      },
    });

    let debitTotal = 0;
    let creditTotal = 0;
    const lines: { accountId: string; debit: number; credit: number; description?: string; projectId?: string; vendorId?: string; costHeadId?: string; paymentMethodId?: string }[] = [];

    let journalApVendorId: string | null = null;
    let journalApAmount = 0;
    if (type === VoucherType.JOURNAL && expenseType === ExpenseType.PROJECT_EXPENSE && projectId) {
      const amt = faker.number.int({ min: 5000, max: 50000 });
      journalApVendorId = pickVendor();
      journalApAmount = amt;
      lines.push({ accountId: getAccount('5010'), debit: amt, credit: 0, description: 'Materials', projectId, vendorId: journalApVendorId, costHeadId: pickCostHead() });
      lines.push({ accountId: getAccount('2010'), debit: 0, credit: amt, vendorId: journalApVendorId });
      debitTotal += amt;
      creditTotal += amt;
    } else if (type === VoucherType.JOURNAL && expenseType === ExpenseType.OFFICE_EXPENSE) {
      const amt = faker.number.int({ min: 2000, max: 15000 });
      lines.push({ accountId: getAccount('5040'), debit: amt, credit: 0, description: 'Office rent' });
      lines.push({ accountId: getAccount('2010'), debit: 0, credit: amt });
      debitTotal += amt;
      creditTotal += amt;
    } else if (type === VoucherType.PAYMENT) {
      const amt = faker.number.int({ min: 3000, max: 40000 });
      const vid = pickVendor();
      const pmId = pickPaymentMethod();
      lines.push({ accountId: getAccount('2010'), debit: amt, credit: 0, description: 'Payment to vendor', vendorId: vid });
      lines.push({ accountId: getAccount('1020'), debit: 0, credit: amt, paymentMethodId: pmId });
      debitTotal += amt;
      creditTotal += amt;
    } else if (type === VoucherType.RECEIPT) {
      const amt = faker.number.int({ min: 10000, max: 100000 });
      lines.push({ accountId: getAccount('1010'), debit: amt, credit: 0, description: 'Cash received' });
      lines.push({ accountId: getAccount('4010'), debit: 0, credit: amt });
      debitTotal += amt;
      creditTotal += amt;
    } else {
      const amt = faker.number.int({ min: 5000, max: 30000 });
      lines.push({ accountId: getAccount('1010'), debit: amt, credit: 0, description: 'Contra' });
      lines.push({ accountId: getAccount('1020'), debit: 0, credit: amt });
      debitTotal += amt;
      creditTotal += amt;
    }

    for (const ln of lines) {
      const vl = await prisma.voucherLine.create({
        data: {
          voucherId: voucher.id,
          companyId: company.id,
          accountId: ln.accountId,
          debit: ln.debit,
          credit: ln.credit,
          description: ln.description,
          projectId: ln.projectId ?? null,
          vendorId: ln.vendorId ?? null,
          costHeadId: ln.costHeadId ?? null,
          paymentMethodId: ln.paymentMethodId ?? null,
        },
      });
      if (type === VoucherType.JOURNAL && journalApVendorId && ln.credit > 0 && getAccount('2010') === ln.accountId) {
        journalApCreditLines.push({ id: vl.id, vendorId: journalApVendorId, amount: journalApAmount });
      }
      if (type === VoucherType.PAYMENT && ln.vendorId && ln.debit > 0 && getAccount('2010') === ln.accountId) {
        paymentVouchersWithVendor.push({ voucherId: voucher.id, vendorId: ln.vendorId, amount: ln.debit });
      }
    }
  }

  const usedSourceIds = new Set<string>();
  for (const pv of paymentVouchersWithVendor.slice(0, 8)) {
    const sl = journalApCreditLines.find((s) => s.vendorId === pv.vendorId && !usedSourceIds.has(s.id));
    if (!sl) continue;
    const existing = await prisma.vendorAllocation.findFirst({
      where: { paymentVoucherId: pv.voucherId, sourceLineId: sl.id },
    });
    if (existing) continue;
    await prisma.vendorAllocation.create({
      data: {
        paymentVoucherId: pv.voucherId,
        sourceLineId: sl.id,
        amount: Math.min(sl.amount, pv.amount),
      },
    });
    usedSourceIds.add(sl.id);
  }

  const reversalCount = await prisma.voucher.count({
    where: { companyId: company.id, reversalOfId: { not: null } },
  });
  const posted = await prisma.voucher.findMany({
    where: { companyId: company.id, status: VoucherStatus.POSTED },
    take: Math.min(2, 2 - reversalCount),
  });
  for (const orig of posted) {
    const revNo = nextVoucherNo(ctx, 'REV');
    const revBy = creator();
    const revAt = new Date(orig.date.getTime() + 2 * 24 * 60 * 60 * 1000);
    const rev = await prisma.voucher.create({
      data: {
        companyId: company.id,
        voucherNo: revNo,
        type: orig.type,
        expenseType: orig.expenseType,
        projectId: orig.projectId,
        date: revAt,
        status: VoucherStatus.REVERSED,
        narration: `Reversal of ${orig.voucherNo}`,
        createdByUserId: revBy,
        reversalOfId: orig.id,
        reversedById: revBy,
        reversedAt: revAt,
      },
    });
    const origLines = await prisma.voucherLine.findMany({ where: { voucherId: orig.id } });
    for (const ol of origLines) {
      await prisma.voucherLine.create({
        data: {
          voucherId: rev.id,
          companyId: company.id,
          accountId: ol.accountId,
          debit: ol.credit,
          credit: ol.debit,
          description: `Rev: ${ol.description ?? ''}`,
          projectId: ol.projectId,
          vendorId: ol.vendorId,
          costHeadId: ol.costHeadId,
          paymentMethodId: ol.paymentMethodId,
        },
      });
    }
    await prisma.voucher.update({
      where: { id: orig.id },
      data: { status: VoucherStatus.REVERSED, reversedById: revBy, reversedAt: revAt },
    });
  }

  const months = [
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    new Date(now.getFullYear(), now.getMonth() - 2, 1),
  ];
  const allocJson: Record<string, number> = {};
  allocJson[ctx.projectIds.main] = 40;
  ctx.projectIds.subs.forEach((id, idx) => {
    allocJson[id] = [20, 25, 15][idx] ?? 20;
  });
  for (const m of months) {
    const method = m.getMonth() % 2 === 0 ? OverheadAllocationMethod.PERCENT : OverheadAllocationMethod.CONTRACT_VALUE;
    await prisma.overheadAllocationRule.upsert({
      where: { companyId_month: { companyId: company.id, month: m } },
      update: { method, allocations: method === OverheadAllocationMethod.PERCENT ? allocJson : undefined },
      create: {
        companyId: company.id,
        month: m,
        method,
        allocations: method === OverheadAllocationMethod.PERCENT ? allocJson : undefined,
        createdById: ctx.userIds[0],
      },
    });
    const rule = await prisma.overheadAllocationRule.findFirstOrThrow({
      where: { companyId: company.id, month: m },
    });
    await prisma.overheadAllocationResult.deleteMany({ where: { ruleId: rule.id } });
    const sourceTotal = 100000 + faker.number.int({ min: 0, max: 50000 });
    for (const pid of allProjectIds) {
      const pct = method === OverheadAllocationMethod.PERCENT ? (allocJson[pid] ?? 25) / 100 : 0.25;
      const amt = Math.round(sourceTotal * pct * 100) / 100;
      await prisma.overheadAllocationResult.create({
        data: {
          ruleId: rule.id,
          companyId: company.id,
          projectId: pid,
          amount: amt,
          method,
          sourceOverheadTotal: sourceTotal,
        },
      });
    }
  }

  const attCount = await prisma.attachment.count({ where: { companyId: company.id } });
  for (let i = attCount; i < 10; i++) {
    await prisma.attachment.create({
      data: {
        companyId: company.id,
        uploadedByUserId: faker.helpers.arrayElement(ctx.userIds),
        url: `https://example.com/files/${faker.string.alphanumeric(12)}.pdf`,
        fileName: `doc-${i + 1}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: faker.number.int({ min: 1024, max: 512000 }),
      },
    });
  }

  const pfCount = await prisma.projectFile.count({ where: { companyId: company.id } });
  for (let i = pfCount; i < 6; i++) {
    await prisma.projectFile.create({
      data: {
        companyId: company.id,
        projectId: faker.helpers.arrayElement(allProjectIds),
        filename: `project-file-${i + 1}.pdf`,
        url: `https://example.com/projects/${faker.string.alphanumeric(12)}.pdf`,
        mimeType: 'application/pdf',
        size: faker.number.int({ min: 2048, max: 256000 }),
      },
    });
  }

  const auditCount = await prisma.auditLog.count({ where: { companyId: company.id } });
  const entities = ['Project', 'Voucher', 'Vendor', 'Account', 'User'];
  for (let i = auditCount; i < 20; i++) {
    const entityType = faker.helpers.arrayElement(entities);
    const entityId = entityType === 'Project' ? faker.helpers.arrayElement(allProjectIds)
      : entityType === 'Voucher' ? (await prisma.voucher.findFirst({ where: { companyId: company.id }, select: { id: true } }))?.id ?? ctx.projectIds.main
      : entityType === 'Vendor' ? faker.helpers.arrayElement(ctx.vendorIds)
      : entityType === 'Account' ? (Object.values(ctx.accountIdsByCode))[i % Object.keys(ctx.accountIdsByCode).length]
      : faker.helpers.arrayElement(ctx.userIds);
    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        entityType,
        entityId,
        action: faker.helpers.arrayElement(['CREATE', 'UPDATE', 'VIEW', 'DELETE']),
        actorUserId: faker.helpers.arrayElement(ctx.userIds),
        before: { old: faker.lorem.word() },
        after: { new: faker.lorem.word() },
        diffJson: { changed: ['name'] },
        metaJson: { ip: '127.0.0.1' },
      },
    });
  }

  // Seed expense categories (default categories)
  const defaultCategoryNames = ['CIVIL', 'MATERIALS', 'MATI KATA', 'BROKERAGE', 'OTHERS'];
  for (const catName of defaultCategoryNames) {
    const category = await prisma.expenseCategory.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: catName,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name: catName,
        isActive: true,
      },
    });
    ctx.expenseCategoryIds.push(category.id);
  }

  // Seed expenses - create expenses across 2 projects including MATI KATA and MATERIALS
  const existingExpenses = await prisma.expense.count({ where: { companyId: company.id } });
  const expensesToCreate = Math.max(0, 10 - existingExpenses);
  
  const expenseSources: ExpenseSource[] = [ExpenseSource.WAREHOUSE, ExpenseSource.LABOR];
  
  // Get expense account IDs (debit accounts)
  const debitAccountIds = [
    ctx.accountIdsByCode['5010'], // Direct Materials
    ctx.accountIdsByCode['5020'], // Direct Labor
    ctx.accountIdsByCode['5030'], // Site Overhead
  ].filter(Boolean) as string[];

  // Get payment account IDs (credit accounts - cash/bank)
  const creditAccountIds = [
    ctx.accountIdsByCode['1010'], // Cash
    ctx.accountIdsByCode['1020'], // Bank
  ].filter(Boolean) as string[];

  for (let i = 0; i < expensesToCreate; i++) {
    const projectId = faker.helpers.arrayElement(allProjectIds);
    // Determine mainProjectId
    const selectedProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { parentProjectId: true },
    });
    const mainProjectId = selectedProject?.parentProjectId || projectId;
    
    const date = faker.date.between({ from: past90, to: now });
    const categoryId = faker.helpers.arrayElement(ctx.expenseCategoryIds);
    const source = faker.helpers.arrayElement(expenseSources);
    const amount = faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 });
    const vendorId = faker.number.float({ min: 0, max: 1 }) < 0.7 ? faker.helpers.arrayElement(ctx.vendorIds) : null;
    const paymentMethodId = faker.helpers.arrayElement(ctx.paymentMethodIds);
    const debitAccountId = debitAccountIds.length > 0 ? faker.helpers.arrayElement(debitAccountIds) : debitAccountIds[0];
    const creditAccountId = creditAccountIds.length > 0 ? faker.helpers.arrayElement(creditAccountIds) : creditAccountIds[0];
    const paidByUserId = faker.helpers.arrayElement(ctx.userIds);
    
    // Generate voucher number
    const voucherNo = nextVoucherNo(ctx, 'PV');
    
    // Create expense with voucher in transaction
    await prisma.$transaction(async (tx) => {
      // Create voucher
      const voucher = await tx.voucher.create({
        data: {
          companyId: company.id,
          projectId,
          voucherNo,
          type: VoucherType.PAYMENT,
          date,
          status: VoucherStatus.POSTED,
          narration: `Expense: ${faker.lorem.sentence()}`,
          createdByUserId: paidByUserId,
          postedByUserId: paidByUserId,
          postedAt: new Date(),
          lines: {
            create: [
              {
                companyId: company.id,
                accountId: debitAccountId,
                description: 'Expense',
                debit: amount,
                credit: 0,
                projectId,
                paymentMethodId,
              },
              {
                companyId: company.id,
                accountId: creditAccountId,
                description: 'Payment',
                debit: 0,
                credit: amount,
                projectId,
                paymentMethodId,
                vendorId,
              },
            ],
          },
        },
      });

      // Create expense
      await tx.expense.create({
        data: {
          companyId: company.id,
          projectId,
          mainProjectId,
          date,
          categoryId,
          source,
          amount,
          paidByUserId,
          paidTo: vendorId ? null : faker.company.name(),
          vendorId,
          paymentMethodId,
          debitAccountId,
          creditAccountId,
          voucherId: voucher.id,
          notes: faker.lorem.sentence(),
        },
      });
    });
  }

  return ctx;
}

async function main() {
  console.log('🌱 Starting comprehensive seed...');
  passwordHash = await bcrypt.hash(PASSWORD, 10);

  const companies: { name: string; ctx: SeedContext }[] = [];
  for (const name of COMPANY_NAMES) {
    const ctx = await seedCompany(name);
    companies.push({ name, ctx });
  }

  const totalUsers = companies.reduce((s, c) => s + c.ctx.userIds.length, 0);
  const totalProjects = companies.reduce((s, c) => s + 1 + c.ctx.projectIds.subs.length, 0);
  const totalVouchers = await prisma.voucher.count();

  console.log('\n✅ Seed complete.\n');
  console.log('Summary:');
  console.log(`  Companies: ${companies.length} (${COMPANY_NAMES.join(', ')})`);
  console.log(`  Users: ${totalUsers} (password: ${PASSWORD})`);
  console.log(`  Projects: ${totalProjects} (1 main + 3 sub per company)`);
  console.log(`  Vouchers: ${totalVouchers}`);
  console.log('\nRun `npx prisma db seed` or `npm run db:seed` to re-seed.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
