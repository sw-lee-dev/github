import { useEffect, useState, type FormEvent } from 'react';
import { api, type ProductPayload } from '../api/client';
import type { Product } from '../api/types';
import { canManageMaster, useAuth } from '../auth/AuthContext';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import { PRODUCT_CODE_PREFIX, nextCode } from '../utils/code';
import { fmtInt, fmtWeight } from '../utils/format';

const EMPTY: ProductPayload = { name: '', specWeight: 0, specCount: 1, salePrice: 0, active: true };

export default function ProductsPage() {
  const { user } = useAuth();
  const editable = canManageMaster(user);
  const [rows, setRows] = useState<Product[] | null>(null);
  const [form, setForm] = useState<ProductPayload | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => api.products().then(setRows).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      const body = form;
      const saved = editingId ? await api.updateProduct(editingId, body) : await api.createProduct(body);
      setNotice(`${saved.code} ${saved.name} ${editingId ? '수정' : '등록'} 완료`);
      setForm(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">제품</h1>
        {editable && !form && (
          <button className="btn btn-brand" onClick={() => { setEditingId(null); setForm({ ...EMPTY }); setError(null); setNotice(null); }}>
            <i className="bi bi-plus-lg me-1" />제품 등록
          </button>
        )}
      </div>
      <ErrorAlert message={error} />
      {notice && <div className="alert alert-success py-2"><i className="bi bi-check-circle me-2" />{notice}</div>}

      {form && (
        <form className="card shadow-sm mb-3" onSubmit={save}>
          <div className="card-header bg-white fw-semibold">{editingId ? '제품 수정' : '제품 등록'}</div>
          <div className="card-body row g-2">
            <div className="col-6 col-md-2">
              <label className="form-label small">제품코드</label>
              <input className="form-control form-control-sm bg-light" readOnly tabIndex={-1}
                value={editingId ? editingCode : nextCode(PRODUCT_CODE_PREFIX, (rows ?? []).map((p) => p.code))}
                title="제품코드는 자동으로 부여되며 수정할 수 없습니다" />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">제품명</label>
              <input className="form-control form-control-sm" value={form.name} required
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small">규격 (무게 × 입수)</label>
              <div className="input-group input-group-sm">
                <input type="number" step="0.001" min={0} className="form-control text-end" aria-label="규격 무게(g)" required
                  value={form.specWeight} onChange={(e) => setForm({ ...form, specWeight: Number(e.target.value) })} />
                <span className="input-group-text">g ×</span>
                <input type="number" step="1" min={1} className="form-control text-end" aria-label="규격 입수(EA)" required
                  value={form.specCount} onChange={(e) => setForm({ ...form, specCount: Number(e.target.value) })} />
                <span className="input-group-text">EA</span>
              </div>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">제품 당 무게(g)</label>
              <input className="form-control form-control-sm text-end bg-light" readOnly tabIndex={-1} aria-label="제품 당 무게(자동)"
                value={fmtWeight((form.specWeight || 0) * (form.specCount || 0))} title="규격 g × EA 로 자동 계산됩니다" />
            </div>
            <div className="col-6 col-md-1">
              <label className="form-label small">판매가(원)</label>
              <input type="number" min={0} className="form-control form-control-sm text-end" value={form.salePrice} required
                onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
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
          <table className="table table-hover table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>코드</th><th>제품명</th><th>규격</th><th className="text-end">제품 당 무게(g)</th><th className="text-end">판매가(원)</th><th>판매</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'text-muted'}>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td>{p.spec ?? '-'}</td>
                  <td className="text-end">{fmtWeight(p.unitWeight)}</td>
                  <td className="text-end">{fmtInt(p.salePrice)}</td>
                  <td>{p.active ? 'Y' : 'N'}</td>
                  {editable && (
                    <td className="text-end">
                      <button className="btn btn-sm btn-link" onClick={() => {
                        setEditingId(p.id);
                        setEditingCode(p.code);
                        setForm({ name: p.name, specWeight: p.specWeight, specCount: p.specCount, salePrice: p.salePrice, active: p.active });
                        setError(null);
                        setNotice(null);
                      }}>수정</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
