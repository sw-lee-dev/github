import { useEffect, useState, type FormEvent } from 'react';
import { api, type MaterialPayload } from '../api/client';
import type { Material, MaterialType } from '../api/types';
import { canManageMaster, useAuth } from '../auth/AuthContext';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import { fmtWon2 } from '../utils/format';

const EMPTY: MaterialPayload = { code: '', name: '', type: 'RAW', unit: 'kg', unitPrice: 0, active: true };

export default function MaterialsPage() {
  const { user } = useAuth();
  const editable = canManageMaster(user);
  const [rows, setRows] = useState<Material[] | null>(null);
  const [filter, setFilter] = useState<MaterialType | ''>('');
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState<MaterialPayload | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.materials().then(setRows).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditingId(null); setForm({ ...EMPTY }); setError(null); };
  const openEdit = (m: Material) => {
    setEditingId(m.id);
    setForm({ code: m.code, name: m.name, type: m.type, unit: m.unit, unitPrice: m.unitPrice, active: m.active });
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      if (editingId) await api.updateMaterial(editingId, form);
      else await api.createMaterial(form);
      setForm(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const shown = (rows ?? []).filter(
    (m) => (!filter || m.type === filter) && (!keyword || m.name.includes(keyword) || m.code.includes(keyword.toUpperCase())),
  );

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">원재료·포장재</h1>
        {editable && !form && (
          <button className="btn btn-brand" onClick={openNew}><i className="bi bi-plus-lg me-1" />자재 등록</button>
        )}
      </div>
      <ErrorAlert message={error} />

      {form && (
        <form className="card shadow-sm mb-3" onSubmit={save}>
          <div className="card-header bg-white fw-semibold">{editingId ? '자재 수정' : '자재 등록'}</div>
          <div className="card-body row g-2">
            <div className="col-6 col-md-2">
              <label className="form-label small">자재코드</label>
              <input className="form-control form-control-sm" value={form.code} disabled={!!editingId} required
                onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="M-013" />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small">자재명</label>
              <input className="form-control form-control-sm" value={form.name} required
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small">구분</label>
              <select className="form-select form-select-sm" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })}>
                <option value="RAW">원재료</option>
                <option value="PACKAGING">포장재</option>
              </select>
            </div>
            <div className="col-4 col-md-1">
              <label className="form-label small">단위</label>
              <input className="form-control form-control-sm" value={form.unit} required
                onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small">단가(원)</label>
              <input type="number" step="any" min={0} className="form-control form-control-sm text-end" value={form.unitPrice} required
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
            </div>
            <div className="col-12 col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input id="mat-active" type="checkbox" className="form-check-input" checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <label htmlFor="mat-active" className="form-check-label small">사용</label>
              </div>
            </div>
          </div>
          <div className="card-footer bg-white d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-sm btn-light" onClick={() => setForm(null)}>취소</button>
            <button className="btn btn-sm btn-brand">저장</button>
          </div>
        </form>
      )}

      <div className="d-flex flex-wrap gap-2 mb-2">
        <select className="form-select form-select-sm w-auto" value={filter} aria-label="구분 필터"
          onChange={(e) => setFilter(e.target.value as MaterialType | '')}>
          <option value="">전체</option>
          <option value="RAW">원재료</option>
          <option value="PACKAGING">포장재</option>
        </select>
        <input className="form-control form-control-sm" style={{ maxWidth: 220 }} placeholder="자재명/코드 검색"
          value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>

      {!rows ? <Loading /> : (
        <div className="table-responsive bg-white border rounded">
          <table className="table table-hover table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>코드</th><th>자재명</th><th>구분</th><th>단위</th><th className="text-end">단가(원)</th><th>사용</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id} className={m.active ? '' : 'text-muted'}>
                  <td className="text-nowrap">{m.code}</td>
                  <td>{m.name}</td>
                  <td><span className={`badge ${m.type === 'RAW' ? 'bar-raw' : 'bar-pack'}`}>{m.typeLabel}</span></td>
                  <td>{m.unit}</td>
                  <td className="text-end">{fmtWon2(m.unitPrice)}</td>
                  <td>{m.active ? 'Y' : 'N'}</td>
                  {editable && (
                    <td className="text-end">
                      <button className="btn btn-sm btn-link" onClick={() => openEdit(m)}>수정</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="form-text mt-2">단가를 바꿔도 이미 작성된 원가계산서에는 반영되지 않습니다. (작성 시점 단가로 보관)</p>
    </>
  );
}
