import { useEffect, useState, type FormEvent } from 'react';
import { api, type ProductPayload } from '../api/client';
import type { Product } from '../api/types';
import { canManageMaster, useAuth } from '../auth/AuthContext';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import { fmtWon } from '../utils/format';

const EMPTY: ProductPayload = { code: '', name: '', spec: '', salePrice: 0, active: true };

export default function ProductsPage() {
  const { user } = useAuth();
  const editable = canManageMaster(user);
  const [rows, setRows] = useState<Product[] | null>(null);
  const [form, setForm] = useState<ProductPayload | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.products().then(setRows).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      const body = { ...form, spec: form.spec?.trim() || null };
      if (editingId) await api.updateProduct(editingId, body);
      else await api.createProduct(body);
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
          <button className="btn btn-brand" onClick={() => { setEditingId(null); setForm({ ...EMPTY }); setError(null); }}>
            <i className="bi bi-plus-lg me-1" />제품 등록
          </button>
        )}
      </div>
      <ErrorAlert message={error} />

      {form && (
        <form className="card shadow-sm mb-3" onSubmit={save}>
          <div className="card-header bg-white fw-semibold">{editingId ? '제품 수정' : '제품 등록'}</div>
          <div className="card-body row g-2">
            <div className="col-6 col-md-2">
              <label className="form-label small">제품코드</label>
              <input className="form-control form-control-sm" value={form.code} disabled={!!editingId} required
                onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FG-004" />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small">제품명</label>
              <input className="form-control form-control-sm" value={form.name} required
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small">규격</label>
              <input className="form-control form-control-sm" value={form.spec ?? ''}
                onChange={(e) => setForm({ ...form, spec: e.target.value })} placeholder="200g (10입)" />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">판매가(원)</label>
              <input type="number" min={0} className="form-control form-control-sm text-end" value={form.salePrice} required
                onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
            </div>
            <div className="col-12 col-md-2 d-flex align-items-end">
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
                <th>코드</th><th>제품명</th><th>규격</th><th className="text-end">판매가(원)</th><th>판매</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'text-muted'}>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td>{p.spec ?? '-'}</td>
                  <td className="text-end">{fmtWon(p.salePrice)}</td>
                  <td>{p.active ? 'Y' : 'N'}</td>
                  {editable && (
                    <td className="text-end">
                      <button className="btn btn-sm btn-link" onClick={() => {
                        setEditingId(p.id);
                        setForm({ code: p.code, name: p.name, spec: p.spec, salePrice: p.salePrice, active: p.active });
                        setError(null);
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
