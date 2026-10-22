import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { api, type ProductPayload } from '../api/client';
import type { Product } from '../api/types';
import { canManageMaster, useAuth } from '../auth/AuthContext';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import PriceHistoryModal from '../components/PriceHistoryModal';
import { PRODUCT_CODE_PREFIX, nextCode } from '../utils/code';
import { fmtInt } from '../utils/format';

/** 규격(g, EA) 입력칸: 정수만. 소수점·부호·지수 키는 막고, 붙여넣은 소수는 소수점 아래를 버린다 */
const intInput = {
  type: 'number',
  step: 1,
  min: 1,
  inputMode: 'numeric',
  required: true,
  title: '정수만 입력할 수 있습니다',
  className: 'form-control text-end',
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
    if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  },
} as const;
const toInt = (v: string) => Math.max(0, Math.trunc(Number(v) || 0));

const EMPTY: ProductPayload = { name: '', specWeight: 0, specCount: 1, active: true };

export default function ProductsPage() {
  const { user } = useAuth();
  const editable = canManageMaster(user);
  const [rows, setRows] = useState<Product[] | null>(null);
  const [form, setForm] = useState<ProductPayload | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState<string>('');
  /** 수정 중인 제품의 판매가 (읽기 전용 표시용) */
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  /** 판매가가 책정된 제품: 판매여부만 바꿀 수 있는 수정창 */
  const [activeOnly, setActiveOnly] = useState(false);
  const [historyOf, setHistoryOf] = useState<Product | null>(null);
  const closeHistory = useCallback(() => setHistoryOf(null), []);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => api.products().then(setRows).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      const body = form;
      const saved = editingId && activeOnly
        ? await api.changeProductActive(editingId, form.active)
        : editingId ? await api.updateProduct(editingId, body) : await api.createProduct(body);
      setNotice(`${saved.code} ${saved.name} ${editingId ? '수정' : '등록'} 완료`);
      setForm(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // 판매여부만 수정할 때 규격 입력칸은 읽기 전용
  const lockProps = activeOnly ? { readOnly: true, tabIndex: -1, className: `${intInput.className} bg-light` } : {};

  const openEdit = (p: Product, onlyActive: boolean) => {
    setEditingId(p.id);
    setEditingCode(p.code);
    setEditingPrice(p.salePrice);
    setActiveOnly(onlyActive);
    setForm({ name: p.name, specWeight: p.specWeight, specCount: p.specCount, active: p.active });
    setError(null);
    setNotice(null);
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">제품</h1>
        {editable && !form && (
          <button className="btn btn-brand" onClick={() => { setEditingId(null); setEditingPrice(null); setActiveOnly(false); setForm({ ...EMPTY }); setError(null); setNotice(null); }}>
            <i className="bi bi-plus-lg me-1" />제품 등록
          </button>
        )}
      </div>
      <ErrorAlert message={error} />
      {notice && <div className="alert alert-success py-2"><i className="bi bi-check-circle me-2" />{notice}</div>}

      {form && (
        <form className="card shadow-sm mb-3" onSubmit={save}>
          <div className="card-header bg-white fw-semibold">
            {editingId ? '제품 수정' : '제품 등록'}
            {activeOnly && <span className="small text-muted fw-normal ms-2">판매가가 책정된 제품은 판매여부만 변경할 수 있습니다</span>}
          </div>
          <div className="card-body row g-2">
            <div className="col-6 col-md-2">
              <label className="form-label small">제품코드</label>
              <input className="form-control form-control-sm bg-light" readOnly tabIndex={-1}
                value={editingId ? editingCode : nextCode(PRODUCT_CODE_PREFIX, (rows ?? []).map((p) => p.code))}
                title="제품코드는 자동으로 부여되며 수정할 수 없습니다" />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">제품명</label>
              <input className={`form-control form-control-sm ${activeOnly ? 'bg-light' : ''}`} value={form.name} required
                readOnly={activeOnly} tabIndex={activeOnly ? -1 : undefined}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small">규격 (무게 × 입수)</label>
              <div className="input-group input-group-sm">
                <input {...intInput} {...lockProps} aria-label="규격 무게(g)" value={form.specWeight || ''}
                  onChange={(e) => setForm({ ...form, specWeight: toInt(e.target.value) })} />
                <span className="input-group-text">g</span>
                <input {...intInput} {...lockProps} aria-label="규격 입수(EA)" value={form.specCount || ''}
                  onChange={(e) => setForm({ ...form, specCount: toInt(e.target.value) })} />
                <span className="input-group-text">EA</span>
              </div>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">제품 당 무게(g)</label>
              <input className="form-control form-control-sm text-end bg-light" readOnly tabIndex={-1} aria-label="제품 당 무게(자동)"
                value={fmtInt((form.specWeight || 0) * (form.specCount || 0))} title="규격 g × EA 로 자동 계산됩니다" />
            </div>
            <div className="col-6 col-md-1">
              <label className="form-label small">판매가(원)</label>
              <input className="form-control form-control-sm text-end bg-light" readOnly tabIndex={-1} aria-label="판매가(결재 승인 시 책정)"
                value={editingId && editingPrice != null ? fmtInt(editingPrice) : ''}
                title="판매가는 원가계산서가 최종 승인되면 책정됩니다" />
            </div>
            <div className="col-12 col-md-1 d-flex align-items-end">
              <div className="form-check">
                <input id="prd-active" type="checkbox" className="form-check-input" checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <label htmlFor="prd-active" className="form-check-label small">판매중</label>
              </div>
            </div>
          </div>
          <div className="card-footer bg-white d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-sm btn-light" onClick={() => setForm(null)}>취소</button>
            <button className="btn btn-sm btn-brand">저장</button>
          </div>
        </form>
      )}

      {!rows ? <Loading /> : (
        <div className="table-responsive bg-white border rounded">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>코드</th><th>제품명</th><th>규격</th><th className="text-end">제품 당 무게(g)</th><th className="text-end">판매가(원)</th><th className="text-center">판매여부</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'text-muted'}>
                  <td>{p.code}</td>
                  <td>
                    {/* 판매가가 책정된 제품만 이름을 눌러 판매가 이력을 본다 */}
                    {p.salePrice != null ? (
                      <button type="button" className="btn btn-link p-0 align-baseline product-link" onClick={() => setHistoryOf(p)}>
                        {p.name}
                      </button>
                    ) : p.name}
                  </td>
                  <td>{p.spec ?? '-'}</td>
                  <td className="text-end">{fmtInt(p.unitWeight)}</td>
                  <td className="text-end">{fmtInt(p.salePrice)}</td>
                  <td className="text-center">
                    {/* 판매가가 책정된 제품은 판매여부를 눌러 판매여부만 수정 */}
                    {editable && p.salePrice != null ? (
                      <button type="button" className="btn btn-link p-0 align-baseline product-link" title="판매여부 변경"
                        onClick={() => openEdit(p, true)}>
                        {p.active ? 'Y' : 'N'}
                      </button>
                    ) : p.active ? 'Y' : 'N'}
                  </td>
                  {editable && (
                    <td className="text-end text-nowrap">
                      {!p.editable ? (
                        <span className="small text-muted px-2" title={p.lockReason ?? undefined} data-testid="product-locked">
                          <i className="bi bi-lock me-1" />수정불가
                        </span>
                      ) : <button className="btn btn-sm btn-link" onClick={() => openEdit(p, false)}>수정</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {historyOf && <PriceHistoryModal product={historyOf} onClose={closeHistory} />}
    </>
  );
}
