/**
 * @accounting/shared
 * 
 * Shared Zod schemas and TypeScript types for Phase 1 models
 */

// Company schemas
export {
  CompanyCreateSchema,
  CompanyUpdateSchema,
  type CompanyCreate,
  type CompanyUpdate,
} from './schemas/company';

// Project schemas
export {
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ProjectStatusEnum,
  type ProjectCreate,
  type ProjectUpdate,
  type ProjectStatus,
} from './schemas/project';

// Vendor schemas
export {
  VendorCreateSchema,
  VendorUpdateSchema,
  type VendorCreate,
  type VendorUpdate,
} from './schemas/vendor';

// PaymentMethod schemas
export {
  PaymentMethodCreateSchema,
  PaymentMethodUpdateSchema,
  PaymentMethodTypeEnum,
  type PaymentMethodCreate,
  type PaymentMethodUpdate,
  type PaymentMethodType,
} from './schemas/paymentMethod';

// Attachment schemas
export {
  AttachmentCreateSchema,
  AttachmentListFiltersSchema,
  type AttachmentCreate,
  type AttachmentListFilters,
} from './schemas/attachment';

// Account schemas
export {
  AccountCreateSchema,
  AccountUpdateSchema,
  AccountListFiltersSchema,
  AccountTypeEnum,
  type AccountCreate,
  type AccountUpdate,
  type AccountListFilters,
  type AccountType,
} from './schemas/account';

// Voucher schemas
export {
  VoucherCreateSchema,
  VoucherUpdateSchema,
  VoucherListFiltersSchema,
  VoucherLineCreateSchema,
  VoucherStatusEnum,
  type VoucherCreate,
  type VoucherUpdate,
  type VoucherListFilters,
  type VoucherLineCreate,
  type VoucherStatus,
} from './schemas/voucher';

// Project ledger schemas
export {
  ProjectLedgerFiltersSchema,
  ProjectCostSummaryFiltersSchema,
  type ProjectLedgerFilters,
  type ProjectCostSummaryFilters,
} from './schemas/projectLedger';

// Purchase schemas
export {
  PurchaseCreateSchema,
  PurchaseUpdateSchema,
  PurchaseListFiltersSchema,
  PurchaseLineCreateSchema,
  PurchaseAttachmentCreateSchema,
  PurchaseStatusEnum,
  PurchaseLineTypeEnum,
  type PurchaseCreate,
  type PurchaseUpdate,
  type PurchaseListFilters,
  type PurchaseLineCreate,
  type PurchaseAttachmentCreate,
  type PurchaseStatus,
  type PurchaseLineType,
} from './schemas/purchase';

// Product schemas
export {
  ProductCreateSchema,
  ProductUpdateSchema,
  ProductListFiltersSchema,
  type ProductCreate,
  type ProductUpdate,
  type ProductListFilters,
} from './schemas/product';

// Expense schemas
export {
  ExpenseCreateSchema,
  ExpenseUpdateSchema,
  ExpenseListFiltersSchema,
  ExpenseCategoryEnum,
  ExpenseSourceEnum,
  type ExpenseCreate,
  type ExpenseUpdate,
  type ExpenseListFilters,
  type ExpenseCategory,
  type ExpenseSource,
} from './schemas/expense';

// Stock schemas
export {
  StockItemCreateSchema,
  StockItemUpdateSchema,
  StockItemListFiltersSchema,
  StockMovementInSchema,
  StockMovementOutSchema,
  StockMovementAdjustSchema,
  StockBalanceListFiltersSchema,
  StockMovementListFiltersSchema,
  type StockItemCreate,
  type StockItemUpdate,
  type StockItemListFilters,
  type StockMovementIn,
  type StockMovementOut,
  type StockMovementAdjust,
  type StockBalanceListFilters,
  type StockMovementListFilters,
} from './schemas/stock';
