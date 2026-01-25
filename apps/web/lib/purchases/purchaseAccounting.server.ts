/**
 * Server-only functions for Purchase accounting integration
 * DO NOT import in client components
 */

import { prisma } from '@accounting/db';
import { Prisma } from '@prisma/client';
import { generateVoucherNumber, isLeafAccount } from '@/lib/voucher';
import { NextRequest } from 'next/server';

export interface VoucherCreateData {
  companyId: string;
  projectId: string | null;
  date: Date;
  narration: string | null;
  expenseType: 'PROJECT_EXPENSE' | 'OFFICE_EXPENSE' | null;
  lines: Array<{
    accountId: string;
    description: string | null;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    projectId: string | null;
    vendorId: string | null;
  }>;
}

/**
 * Get default accounts for purchase accounting
 */
async function getDefaultAccounts(companyId: string) {
  // Get Accounts Payable (code 2010)
  const apAccount = await prisma.account.findFirst({
    where: {
      companyId,
      code: '2010',
      isActive: true,
    },
  });

  // Get default purchases/materials account (code 5010 - Direct Materials)
  const purchasesAccount = await prisma.account.findFirst({
    where: {
      companyId,
      code: '5010',
      isActive: true,
    },
  });

  return { apAccount, purchasesAccount };
}

/**
 * Build voucher data from purchase
 */
export async function buildVoucherFromPurchase(
  purchaseId: string,
  companyId: string,
  userId: string
): Promise<{ success: boolean; data?: VoucherCreateData; error?: string }> {
  const purchase = await prisma.purchase.findUnique({
    where: {
      id: purchaseId,
      companyId,
    },
    include: {
      lines: {
        include: {
          product: {
            include: {
              inventoryAccount: true,
            },
          },
        },
      },
      project: true,
      supplierVendor: true,
    },
  });

  if (!purchase) {
    return { success: false, error: 'Purchase not found' };
  }

  if (purchase.voucherId) {
    return { success: false, error: 'Purchase already has a voucher' };
  }

  // Get default accounts
  const { apAccount, purchasesAccount } = await getDefaultAccounts(companyId);

  if (!apAccount) {
    return { success: false, error: 'Accounts Payable account (2010) not found' };
  }

  // Validate AP account is leaf
  const isApLeaf = await isLeafAccount(apAccount.id);
  if (!isApLeaf) {
    return { success: false, error: 'Accounts Payable account must be a leaf account' };
  }

  // Build voucher lines
  const lines: VoucherCreateData['lines'] = [];

  // Debit lines: inventory/cost accounts for each purchase line
  for (const purchaseLine of purchase.lines) {
    let debitAccountId: string;

    // Use product's inventory account if set, otherwise default purchases account
    if (purchaseLine.product.inventoryAccountId) {
      const invAccount = await prisma.account.findUnique({
        where: { id: purchaseLine.product.inventoryAccountId },
      });
      if (invAccount && invAccount.isActive) {
        const isLeaf = await isLeafAccount(invAccount.id);
        if (isLeaf) {
          debitAccountId = invAccount.id;
        } else {
          // Fallback to default if inventory account is not leaf
          if (!purchasesAccount) {
            return {
              success: false,
              error: 'Default purchases account (5010) not found and product inventory account is not leaf',
            };
          }
          debitAccountId = purchasesAccount.id;
        }
      } else {
        // Fallback to default
        if (!purchasesAccount) {
          return {
            success: false,
            error: 'Default purchases account (5010) not found',
          };
        }
        debitAccountId = purchasesAccount.id;
      }
    } else {
      // Use default purchases account
      if (!purchasesAccount) {
        return {
          success: false,
          error: 'Default purchases account (5010) not found',
        };
      }
      debitAccountId = purchasesAccount.id;
    }

    // Calculate line amount after discount (proportional)
    const lineSubtotal = Number(purchaseLine.lineTotal);
    const discountPercent = purchase.discountPercent
      ? Number(purchase.discountPercent)
      : 0;
    const lineDiscount = (lineSubtotal * discountPercent) / 100;
    const lineTotalAfterDiscount = lineSubtotal - lineDiscount;

    lines.push({
      accountId: debitAccountId,
      description: `${purchaseLine.product.name} - ${Number(purchaseLine.quantity)} ${purchaseLine.product.unit}`,
      debit: new Prisma.Decimal(lineTotalAfterDiscount),
      credit: new Prisma.Decimal(0),
      projectId: purchase.projectId,
      vendorId: purchase.supplierVendorId,
    });
  }

  // Credit lines: payment account (if paid) and AP account (if due)
  if (Number(purchase.paidAmount) > 0) {
    if (!purchase.paymentAccountId) {
      return {
        success: false,
        error: 'Payment account is required when paid amount > 0',
      };
    }

    const paymentAccount = await prisma.account.findUnique({
      where: { id: purchase.paymentAccountId },
    });

    if (!paymentAccount || !paymentAccount.isActive) {
      return { success: false, error: 'Payment account not found or inactive' };
    }

    const isLeaf = await isLeafAccount(paymentAccount.id);
    if (!isLeaf) {
      return { success: false, error: 'Payment account must be a leaf account' };
    }

    lines.push({
      accountId: purchase.paymentAccountId,
      description: `Payment for purchase ${purchase.challanNo || purchase.id}`,
      debit: new Prisma.Decimal(0),
      credit: purchase.paidAmount,
      projectId: null,
      vendorId: null,
    });
  }

  if (Number(purchase.dueAmount) > 0) {
    lines.push({
      accountId: apAccount.id,
      description: `Accounts Payable - ${purchase.supplierVendor.name} - ${purchase.challanNo || purchase.id}`,
      debit: new Prisma.Decimal(0),
      credit: purchase.dueAmount,
      projectId: null,
      vendorId: purchase.supplierVendorId,
    });
  }

  // Verify balance
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      success: false,
      error: `Voucher is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
    };
  }

  // Determine voucher type
  let voucherType: 'JOURNAL' | 'PAYMENT' | null = null;
  if (Number(purchase.paidAmount) > 0 && Number(purchase.dueAmount) === 0) {
    voucherType = 'PAYMENT';
  } else {
    voucherType = 'JOURNAL'; // Default for mixed or AP-only
  }

  const narration = `Purchase: ${purchase.challanNo || 'N/A'} - ${purchase.supplierVendor.name}${purchase.reference ? ` (${purchase.reference})` : ''}`;

  return {
    success: true,
    data: {
      companyId,
      projectId: purchase.projectId,
      date: purchase.date,
      narration,
      expenseType: 'PROJECT_EXPENSE',
      lines,
    },
  };
}

/**
 * Ensure purchase has a voucher (create if missing)
 */
export async function ensurePurchaseVoucher(
  purchaseId: string,
  companyId: string,
  userId: string
): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  return await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: {
        id: purchaseId,
        companyId,
      },
    });

    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    if (purchase.voucherId) {
      return { success: true, voucherId: purchase.voucherId };
    }

    // Build voucher data
    const voucherData = await buildVoucherFromPurchase(purchaseId, companyId, userId);
    if (!voucherData.success || !voucherData.data) {
      return { success: false, error: voucherData.error };
    }

    // Generate voucher number
    const voucherNo = await generateVoucherNumber(companyId, voucherData.data.date);

    // Create voucher
    const voucher = await tx.voucher.create({
      data: {
        companyId: voucherData.data.companyId,
        projectId: voucherData.data.projectId,
        voucherNo,
        date: voucherData.data.date,
        narration: voucherData.data.narration,
        expenseType: voucherData.data.expenseType,
        type: 'JOURNAL', // Default, can be overridden
        status: 'DRAFT',
        createdByUserId: userId,
        lines: {
          create: voucherData.data.lines.map((line) => ({
            companyId: voucherData.data!.companyId,
            accountId: line.accountId,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            projectId: line.projectId,
            vendorId: line.vendorId,
          })),
        },
      },
    });

    // Link purchase to voucher
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        voucherId: voucher.id,
        status: 'DRAFT', // Sync status
      },
    });

    return { success: true, voucherId: voucher.id };
  });
}

/**
 * Sync purchase status with voucher status
 */
export async function syncPurchaseStatusWithVoucher(
  voucherId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const voucher = await prisma.voucher.findUnique({
    where: {
      id: voucherId,
      companyId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!voucher) {
    return { success: false, error: 'Voucher not found' };
  }

  // Find purchase linked to this voucher
  const purchase = await prisma.purchase.findFirst({
    where: {
      voucherId,
      companyId,
    },
  });

  if (!purchase) {
    // No purchase linked, nothing to sync
    return { success: true };
  }

  // Map voucher status to purchase status
  const purchaseStatusMap: Record<string, 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'REVERSED'> = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    POSTED: 'POSTED',
    REVERSED: 'REVERSED',
  };

  const newPurchaseStatus = purchaseStatusMap[voucher.status];
  if (!newPurchaseStatus) {
    return { success: false, error: `Unknown voucher status: ${voucher.status}` };
  }

  // Update purchase status if different
  if (purchase.status !== newPurchaseStatus) {
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: newPurchaseStatus },
    });
  }

  return { success: true };
}

/**
 * Create inventory transactions for a posted purchase
 */
export async function createInventoryTxnsForPostedPurchase(
  purchaseId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  return await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: {
        id: purchaseId,
        companyId,
      },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        warehouse: true,
      },
    });

    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    if (purchase.status !== 'POSTED') {
      return { success: false, error: 'Purchase must be POSTED to create inventory transactions' };
    }

    // Create inventory transactions for each line
    for (const line of purchase.lines) {
      // Only create inventory txns for inventory products
      if (!line.product.isInventory) {
        continue;
      }

      await tx.inventoryTxn.create({
        data: {
          companyId,
          productId: line.productId,
          purchaseId: purchase.id,
          projectId: purchase.projectId,
          warehouseId: purchase.warehouseId,
          qtyIn: line.quantity,
          qtyOut: new Prisma.Decimal(0),
          unitCost: line.unitPrice,
          totalCost: line.lineTotal,
          txnDate: purchase.date,
        },
      });
    }

    return { success: true };
  });
}

/**
 * Create inventory reversal transactions for a reversed purchase
 */
export async function createInventoryReversalForPurchase(
  purchaseId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  return await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: {
        id: purchaseId,
        companyId,
      },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        warehouse: true,
      },
    });

    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    if (purchase.status !== 'REVERSED') {
      return {
        success: false,
        error: 'Purchase must be REVERSED to create inventory reversal transactions',
      };
    }

    // Find original inventory transactions
    const originalTxns = await tx.inventoryTxn.findMany({
      where: {
        purchaseId: purchase.id,
        companyId,
        qtyIn: { gt: 0 },
      },
    });

    // Create reversal transactions (qtyOut = original qtyIn)
    for (const originalTxn of originalTxns) {
      await tx.inventoryTxn.create({
        data: {
          companyId,
          productId: originalTxn.productId,
          purchaseId: purchase.id,
          projectId: originalTxn.projectId,
          warehouseId: originalTxn.warehouseId,
          qtyIn: new Prisma.Decimal(0),
          qtyOut: originalTxn.qtyIn, // Reverse the quantity
          unitCost: originalTxn.unitCost,
          totalCost: originalTxn.totalCost.neg(), // Negative cost
          txnDate: new Date(), // Reversal date
        },
      });
    }

    return { success: true };
  });
}
