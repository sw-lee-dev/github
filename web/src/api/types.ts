export type Role = 'WRITER' | 'APPROVER' | 'ADMIN';
export type CostStatus = 'DRAFT' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED';
export type StepStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type MaterialType = 'RAW' | 'PACKAGING';
export type ApprovalAction = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface User {
  id: number;
  username: string;
  name: string;
  department: string | null;
  position: string | null;
  role: Role;
  roleLabel: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Material {
  id: number;
  code: string;
  name: string;
  type: MaterialType;
  typeLabel: string;
  unit: string;
  unitPrice: number;
  active: boolean;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  spec: string | null;
  salePrice: number;
  active: boolean;
}

export interface CostSheetSummary {
  id: number;
  docNo: string;
  title: string;
  productName: string;
  writerName: string;
  status: CostStatus;
  statusLabel: string;
  totalCost: number;
  unitCost: number;
  salePrice: number;
  marginRate: number | null;
  currentApproverName: string | null;
  submittedAt: string | null;
  updatedAt: string;
}

export interface CostSheetItem {
  id: number;
  lineNo: number;
  materialId: number;
  materialName: string;
  materialType: MaterialType;
  materialTypeLabel: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lossRate: number;
  amount: number;
}

export interface ApprovalStep {
  id: number;
  seq: number;
  approverId: number;
  approverName: string;
  approverDepartment: string | null;
  status: StepStatus;
  statusLabel: string;
  comment: string | null;
  actedAt: string | null;
}

export interface ApprovalHistory {
  id: number;
  actorName: string;
  action: ApprovalAction;
  actionLabel: string;
  comment: string | null;
  actedAt: string;
}

export interface Permissions {
  canEdit: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  canWithdraw: boolean;
  canApprove: boolean;
}

export interface CostSheetDetail {
  id: number;
  docNo: string;
  title: string;
  productId: number;
  productCode: string;
  productName: string;
  productSpec: string | null;
  productionQty: number;
  salePrice: number;
  materialCost: number;
  packagingCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  marginRate: number | null;
  remark: string | null;
  status: CostStatus;
  statusLabel: string;
  writerId: number;
  writerName: string;
  createdAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  items: CostSheetItem[];
  steps: ApprovalStep[];
  histories: ApprovalHistory[];
  permissions: Permissions;
}

export interface CostSheetSaveRequest {
  title: string;
  productId: number;
  productionQty: number;
  salePrice: number;
  laborCost: number;
  overheadCost: number;
  remark: string | null;
  items: { materialId: number; quantity: number; unitPrice: number | null; lossRate: number | null }[];
  approverIds: number[];
}
