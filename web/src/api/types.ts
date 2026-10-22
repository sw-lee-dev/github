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
  /** 규격 낱개 무게(g) */
  specWeight: number;
  /** 규격 입수(EA) */
  specCount: number;
  /** 규격 표시 문자열 (예: 20g × 10EA) */
  spec: string | null;
  /** 제품 1개당 무게(g) = specWeight × specCount */
  unitWeight: number;
  /** 기준 판매가. 원가계산서가 처음 최종 승인되기 전에는 null */
  salePrice: number | null;
  active: boolean;
  /** 최초 상신 후(반려·회수 전) 또는 판매가 책정 후에는 false */
  editable: boolean;
  /** 수정할 수 없는 이유. 수정 가능하면 null */
  lockReason: string | null;
}

/** 제품 판매가 이력 한 줄 = 최종 승인된 원가계산서 한 건 */
export interface PriceHistory {
  costSheetId: number;
  docNo: string;
  productCode: string;
  productName: string;
  salePrice: number;
  approvedAt: string;
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
  /** 승인 판매가 - 승인완료 문서만 값이 있음 */
  approvedSalePrice: number | null;
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
  /** 배합비(%) - 원자재만 */
  ratio: number | null;
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
  /** 최종 결재자 차례 - 승인 시 승인 판매가 입력 */
  canSetSalePrice: boolean;
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
  /** 제품 1개당 무게(g) */
  unitWeight: number;
  /** 총 생산량(kg) */
  totalOutput: number;
  /** 원재료 손실률(%) */
  rawLossRate: number;
  /** 총 투입량(kg) = 총 생산량 ÷ (1 − 원재료 손실률%) */
  totalInput: number;
  /** 원자재 합계(손실 반영 전) */
  rawSubtotal: number;
  salePrice: number;
  materialCost: number;
  packagingCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  /** 승인 판매가 - 승인완료 문서만 값이 있음 */
  approvedSalePrice: number | null;
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
  rawLossRate: number;
  salePrice: number;
  laborCost: number;
  overheadCost: number;
  remark: string | null;
  /** 원자재는 ratio(배합비%), 포장자재는 quantity(투입량) */
  items: { materialId: number; ratio: number | null; quantity: number | null; unitPrice: number | null; lossRate: number | null }[];
  approverIds: number[];
}
