import type {
  CostSheetDetail,
  CostSheetSaveRequest,
  CostSheetSummary,
  CostStatus,
  LoginResponse,
  Material,
  MaterialType,
  Product,
  User,
} from './types';

const TOKEN_KEY = 'fca.token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* 저장소를 쓸 수 없는 환경(사파리 비공개 모드 등)은 무시 */
    }
  },
};

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

  if (res.status === 401 && !url.endsWith('/auth/login')) {
    onUnauthorized();
  }
  if (!res.ok) {
    let message = `요청에 실패했습니다. (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** 자재코드는 서버가 구분(M/P)에 따라 자동 채번하므로 보내지 않는다. */
export interface MaterialPayload {
  name: string;
  type: MaterialType;
  unit: string;
  unitPrice: number;
  active: boolean;
}

/** 제품코드는 서버가 자동 채번(FG-0001)하므로 보내지 않는다. */
export interface ProductPayload {
  name: string;
  spec: string | null;
  /** 제품 1개당 무게(g) */
  unitWeight: number;
  salePrice: number;
  active: boolean;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('POST', '/api/auth/login', { username, password }),
  me: () => request<User>('GET', '/api/auth/me'),
  approvers: () => request<User[]>('GET', '/api/users/approvers'),

  materials: () => request<Material[]>('GET', '/api/materials'),
  createMaterials: (items: MaterialPayload[]) => request<Material[]>('POST', '/api/materials/batch', { items }),
  updateMaterial: (id: number, p: MaterialPayload) => request<Material>('PUT', `/api/materials/${id}`, p),

  products: () => request<Product[]>('GET', '/api/products'),
  createProduct: (p: ProductPayload) => request<Product>('POST', '/api/products', p),
  updateProduct: (id: number, p: ProductPayload) => request<Product>('PUT', `/api/products/${id}`, p),

  costSheets: (scope: 'mine' | 'all', status?: CostStatus) => {
    const q = new URLSearchParams({ scope });
    if (status) q.set('status', status);
    return request<CostSheetSummary[]>('GET', `/api/cost-sheets?${q}`);
  },
  costSheet: (id: number) => request<CostSheetDetail>('GET', `/api/cost-sheets/${id}`),
  createCostSheet: (body: CostSheetSaveRequest) => request<CostSheetDetail>('POST', '/api/cost-sheets', body),
  updateCostSheet: (id: number, body: CostSheetSaveRequest) =>
    request<CostSheetDetail>('PUT', `/api/cost-sheets/${id}`, body),
  deleteCostSheet: (id: number) => request<void>('DELETE', `/api/cost-sheets/${id}`),
  submit: (id: number) => request<CostSheetDetail>('POST', `/api/cost-sheets/${id}/submit`),
  withdraw: (id: number) => request<CostSheetDetail>('POST', `/api/cost-sheets/${id}/withdraw`),
  approve: (id: number, comment: string) =>
    request<CostSheetDetail>('POST', `/api/cost-sheets/${id}/approve`, { comment }),
  reject: (id: number, comment: string) =>
    request<CostSheetDetail>('POST', `/api/cost-sheets/${id}/reject`, { comment }),

  approvals: (box: 'pending' | 'done') => request<CostSheetSummary[]>('GET', `/api/approvals?box=${box}`),
  approvalCount: () => request<{ pending: number }>('GET', '/api/approvals/count'),
};
