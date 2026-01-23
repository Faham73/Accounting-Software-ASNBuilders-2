import { PrismaClient, UserRole, PaymentMethodType, AccountType, ProjectCostCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create or get default company
  let company = await prisma.company.findFirst({
    where: { name: 'Default Company' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Default Company',
      },
    });
    console.log('✅ Created company:', company.name);
  } else {
    console.log('✅ Company already exists:', company.name);
  }

  // Hash password for all users (same password: 123456)
  const passwordHash = await bcrypt.hash('123456', 10);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash,
      role: UserRole.ADMIN,
      companyId: company.id,
      isActive: true,
    },
  });
  console.log('✅ Created admin user:', adminUser.email);

  // Create accountant user
  const accountantUser = await prisma.user.upsert({
    where: { email: 'accountant@example.com' },
    update: {},
    create: {
      email: 'accountant@example.com',
      name: 'Accountant User',
      passwordHash,
      role: UserRole.ACCOUNTANT,
      companyId: company.id,
      isActive: true,
    },
  });
  console.log('✅ Created accountant user:', accountantUser.email);

  // Create data entry user
  const dataEntryUser = await prisma.user.upsert({
    where: { email: 'dataentry@example.com' },
    update: {},
    create: {
      email: 'dataentry@example.com',
      name: 'Data Entry User',
      passwordHash,
      role: UserRole.DATA_ENTRY,
      companyId: company.id,
      isActive: true,
    },
  });
  console.log('✅ Created data entry user:', dataEntryUser.email);

  // Create viewer user
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      email: 'viewer@example.com',
      name: 'Viewer User',
      passwordHash,
      role: UserRole.VIEWER,
      companyId: company.id,
      isActive: true,
    },
  });
  console.log('✅ Created viewer user:', viewerUser.email);

  // Create engineer user
  const engineerUser = await prisma.user.upsert({
    where: { email: 'engineer@example.com' },
    update: {},
    create: {
      email: 'engineer@example.com',
      name: 'Engineer User',
      passwordHash,
      role: UserRole.ENGINEER,
      companyId: company.id,
      isActive: true,
    },
  });
  console.log('✅ Created engineer user:', engineerUser.email);

  // Create default CostHeads for the default company
  const defaultCostHeads = [
    { name: 'Materials', code: 'MAT' },
    { name: 'Labor', code: 'LAB' },
    { name: 'Equipment', code: 'EQP' },
    { name: 'Overhead', code: 'OVH' },
    { name: 'Transportation', code: 'TRN' },
  ];

  const createdCostHeads: { id: string; name: string }[] = [];
  for (const costHead of defaultCostHeads) {
    const existing = await prisma.costHead.findUnique({
      where: {
        companyId_name: {
          companyId: company.id,
          name: costHead.name,
        },
      },
    });

    if (!existing) {
      const created = await prisma.costHead.create({
        data: {
          companyId: company.id,
          name: costHead.name,
          code: costHead.code,
          isActive: true,
        },
      });
      createdCostHeads.push({ id: created.id, name: created.name });
      console.log(`✅ Created cost head: ${costHead.name}`);
    } else {
      createdCostHeads.push({ id: existing.id, name: existing.name });
      console.log(`⏭️  Cost head already exists: ${costHead.name}`);
    }
  }

  // Create default Project Cost Category Mappings
  // Map cost heads to categories based on name patterns
  const categoryMappings: Array<{ costHeadName: string; category: ProjectCostCategory }> = [
    { costHeadName: 'Materials', category: ProjectCostCategory.MATERIALS },
    { costHeadName: 'Labor', category: ProjectCostCategory.CIVIL },
    { costHeadName: 'Equipment', category: ProjectCostCategory.CIVIL },
    { costHeadName: 'Overhead', category: ProjectCostCategory.OTHERS },
    { costHeadName: 'Transportation', category: ProjectCostCategory.OTHERS },
  ];

  for (const mapping of categoryMappings) {
    const costHead = createdCostHeads.find((ch) => ch.name === mapping.costHeadName);
    if (costHead) {
      const existing = await prisma.projectCostCategoryMap.findUnique({
        where: {
          companyId_costHeadId: {
            companyId: company.id,
            costHeadId: costHead.id,
          },
        },
      });

      if (!existing) {
        await prisma.projectCostCategoryMap.create({
          data: {
            companyId: company.id,
            costHeadId: costHead.id,
            category: mapping.category,
            isActive: true,
          },
        });
        console.log(`✅ Created cost category mapping: ${costHead.name} -> ${mapping.category}`);
      } else {
        console.log(`⏭️  Cost category mapping already exists: ${costHead.name} -> ${mapping.category}`);
      }
    }
  }

  // Create default PaymentMethods for the default company
  const defaultPaymentMethods = [
    { name: 'Cash', type: PaymentMethodType.CASH },
    { name: 'Bank Transfer', type: PaymentMethodType.BANK },
    { name: 'Cheque', type: PaymentMethodType.CHEQUE },
    { name: 'Mobile Payment', type: PaymentMethodType.MOBILE },
  ];

  for (const paymentMethod of defaultPaymentMethods) {
    const existing = await prisma.paymentMethod.findUnique({
      where: {
        companyId_name: {
          companyId: company.id,
          name: paymentMethod.name,
        },
      },
    });

    if (!existing) {
      await prisma.paymentMethod.create({
        data: {
          companyId: company.id,
          name: paymentMethod.name,
          type: paymentMethod.type,
          isActive: true,
        },
      });
      console.log(`✅ Created payment method: ${paymentMethod.name}`);
    } else {
      console.log(`⏭️  Payment method already exists: ${paymentMethod.name}`);
    }
  }

  // Seed default Chart of Accounts for all companies
  const companies = await prisma.company.findMany();
  
  for (const comp of companies) {
    console.log(`\n📊 Seeding Chart of Accounts for: ${comp.name}`);
    
    const defaultAccounts = [
      // Assets (1000-1999)
      { code: '1000', name: 'Assets', type: AccountType.ASSET, parentId: null },
      { code: '1010', name: 'Cash', type: AccountType.ASSET, parentId: null },
      { code: '1020', name: 'Bank', type: AccountType.ASSET, parentId: null },
      { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, parentId: null },
      
      // Liabilities (2000-2999)
      { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY, parentId: null },
      { code: '2010', name: 'Accounts Payable', type: AccountType.LIABILITY, parentId: null },
      { code: '2020', name: 'Advance from Client', type: AccountType.LIABILITY, parentId: null },
      
      // Equity (3000-3999)
      { code: '3000', name: 'Equity', type: AccountType.EQUITY, parentId: null },
      
      // Income (4000-4999)
      { code: '4000', name: 'Income', type: AccountType.INCOME, parentId: null },
      { code: '4010', name: 'Contract Revenue', type: AccountType.INCOME, parentId: null },
      
      // Expenses (5000-5999)
      { code: '5000', name: 'Expenses', type: AccountType.EXPENSE, parentId: null },
      { code: '5010', name: 'Materials Expense', type: AccountType.EXPENSE, parentId: null },
      { code: '5020', name: 'Labour Expense', type: AccountType.EXPENSE, parentId: null },
      { code: '5030', name: 'Mati Kata Expense', type: AccountType.EXPENSE, parentId: null },
      { code: '5040', name: 'Office Expense', type: AccountType.EXPENSE, parentId: null },
      { code: '5090', name: 'Other Project Expense', type: AccountType.EXPENSE, parentId: null },
    ];

    for (const account of defaultAccounts) {
      const existing = await prisma.account.findUnique({
        where: {
          companyId_code: {
            companyId: comp.id,
            code: account.code,
          },
        },
      });

      if (!existing) {
        await prisma.account.create({
          data: {
            companyId: comp.id,
            code: account.code,
            name: account.name,
            type: account.type,
            parentId: account.parentId,
            isActive: true,
          },
        });
        console.log(`  ✅ Created account: ${account.code} - ${account.name}`);
      } else {
        console.log(`  ⏭️  Account already exists: ${account.code} - ${account.name}`);
      }
    }
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Test Users Created:');
  console.log('  - Admin: admin@example.com / 123456');
  console.log('  - Accountant: accountant@example.com / 123456');
  console.log('  - Data Entry: dataentry@example.com / 123456');
  console.log('  - Viewer: viewer@example.com / 123456');
  console.log('  - Engineer: engineer@example.com / 123456');
  console.log('\n📋 Default Master Data Created:');
  console.log('  - 5 Cost Heads (Materials, Labor, Equipment, Overhead, Transportation)');
  console.log('  - Cost Category Mappings (Materials->MATERIALS, Labor->CIVIL, etc.)');
  console.log('  - 4 Payment Methods (Cash, Bank Transfer, Cheque, Mobile Payment)');
  console.log('  - Default Chart of Accounts (Assets, Liabilities, Equity, Income, Expenses)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
