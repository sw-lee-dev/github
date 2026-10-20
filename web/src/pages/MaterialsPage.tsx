import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, type MaterialPayload } from '../api/client';
import type { Material, MaterialType } from '../api/types';
import { canManageMaster, useAuth } from '../auth/AuthContext';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import { MATERIAL_CODE_PREFIX, formatCode, maxSeq } from '../utils/code';
import { fmtWon2 } from '../utils/format';

interface NewRow extends MaterialPayload {
  key: number;
}

let rowSeq = 0;
const DEFAULT_UNIT: Record<MaterialType, string> = { RAW: 'kg', PACKAGING: 'EA' };
const newRow = (type: MaterialType): NewRow => ({
  key: ++rowSeq, name: '', type, unit: DEFAULT_UNIT[type], unitPrice: 0, active: true,
});

export default function MaterialsPage() {
  const { user } = useAuth();
  const editable = canManageMaster(user);
  const [rows, setRows] = useState<Material[] | null>(null);
  const [filter, setFilter] = useState<MaterialType | ''>('');
  const [keyword, setKeyword] = useState('');
  const [newRows, setNewRows] = useState<NewRow[]>([]);
  const [editing, setEditing] = useState<{ id: number; code: string; form: MaterialPayload } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.materials().then(setRows).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  // 등록 예정 행마다 구분별로 이어지는 코드 미리보기 (예: M-0013, M-0014 / P-0006)
  const previewCodes = useMemo(() => {
    const codes = (rows ?? []).map((m) => m.code);
    const last: Partial<Record<MaterialType, number>> = {};
    return newRows.map((r) => {
      const prefix = MATERIAL_CODE_PREFIX[r.type];
      const seq = (last[r.type] ?? maxSeq(prefix, codes)) + 1;
      last[r.type] = seq;
      return formatCode(prefix, seq);
    });
  }, [rows, newRows]);

  const addRow = (type: MaterialType) => {
    setEditing(null);
    setError(null);
    setNotice(null);
    setNewRows((r) => [...r, newRow(type)]);
  };
  const updateRow = (key: number, patch: Partial<MaterialPayload>) =>
    setNewRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const saveNew = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.createMaterials(newRows.map(({ key: _key, ...payload }) => payload));
      setNewRows([]);
      setNotice(`${created.length}건 등록: ${created.map((m) => m.code).join(', ')}`);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (m: Material) => {
    setNewRows([]);
    setNotice(null);
    setError(null);
    setEditing({ id: m.id, code: m.code, form: { name: m.name, type: m.type, unit: m.unit, unitPrice: m.unitPrice, active: m.active } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await api.updateMaterial(editing.id, editing.form);
      setNotice(`${editing.code} 수정 완료`);
      setEditing(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = (rows ?? []).filter(
    (m) => (!filter || m.type === filter) && (!keyword || m.name.includes(keyword) || m.code.includes(keyword.toUpperCase())),
  );

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">원재료·포장재</h1>
        {editable && (
          <div className="d-flex gap-2">
            <button className="btn btn-brand" onClick={() => addRow('RAW')}>
              <i className="bi bi-plus-lg me-1" />원재료 등록
            </button>
            <button className="btn btn-outline-brand" onClick={() => addRow('PACKAGING')}>
              <i className="bi bi-plus-lg me-1" />포장재 등록
            </button>
          </div>
        )}
      </div>
      <ErrorAlert message={error} />
      {notice && <div className="alert alert-success py-2"><i className="bi bi-check-circle me-2" />{notice}</div>}

      {newRows.length > 0 && (
        <form className="card shadow-sm mb-3" onSubmit={saveNew}>
          <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-1">
            <span className="fw-semibold text-nowrap">자재 등록 ({newRows.length}건)</span>
            <span className="small text-muted">자재코드는 구분에 따라 자동 생성됩니다 (원재료 M-0000, 포장재 P-0000)</span>
          </div>
          <div className="card-body vstack gap-2">
            {/* 열 제목. 모바일에서는 행이 여러 줄로 접히므로 칸마다 붙은 라벨로 대신한다 */}
            <div className="material-row material-head d-none d-md-grid" aria-hidden="true">
              <span className="text-center">코드</span>
              <span>자재명</span>
              <span>구분</span>
              <span>단위</span>
              <span className="text-end">단가(원)</span>
              <span />
            </div>
            {newRows.map((r, idx) => (
              <div key={r.key} className="material-row">
                <label className="material-cell">
                  <span className="cell-label">코드</span>
                  <input className="form-control form-control-sm text-center fw-medium bg-light" value={previewCodes[idx]}
                    readOnly tabIndex={-1} aria-label="자재코드(자동)" title="저장 시 자동으로 부여됩니다" />
                </label>
                <label className="material-cell">
                  <span className="cell-label">자재명</span>
                  <input className="form-control form-control-sm" placeholder="자재명" aria-label="자재명" required
                    value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} autoFocus={idx === newRows.length - 1} />
                </label>
                <label className="material-cell">
                  <span className="cell-label">구분</span>
                  <select className="form-select form-select-sm" aria-label="구분" value={r.type}
                    onChange={(e) => {
                      const type = e.target.value as MaterialType;
                      updateRow(r.key, { type, unit: r.unit === DEFAULT_UNIT[r.type] ? DEFAULT_UNIT[type] : r.unit });
                    }}>
                    <option value="RAW">원재료</option>
                    <option value="PACKAGING">포장재</option>
                  </select>
                </label>
                <label className="material-cell">
                  <span className="cell-label">단위</span>
                  <input className="form-control form-control-sm" placeholder="단위" aria-label="단위" required
                    value={r.unit} onChange={(e) => updateRow(r.key, { unit: e.target.value })} />
                </label>
                <label className="material-cell">
                  <span className="cell-label">단가(원)</span>
                  <input type="number" step="any" min={0} className="form-control form-control-sm text-end" placeholder="단가(원)"
                    aria-label="단가" required value={r.unitPrice}
                    onChange={(e) => updateRow(r.key, { unitPrice: Number(e.target.value) })} />
                </label>
                <button type="button" className="btn btn-sm btn-outline-danger" aria-label="행 삭제"
                  onClick={() => setNewRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            ))}
          </div>
          <div className="card-footer bg-white d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-sm btn-light" onClick={() => setNewRows([])}>취소</button>
            <button className="btn btn-sm btn-brand" disabled={busy}>
              {busy && <span className="spinner-border spinner-border-sm me-1" />}{newRows.length}건 저장
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form className="card shadow-sm mb-3" onSubmit={saveEdit}>
          <div className="card-header bg-white fw-semibold">자재 수정</div>
          <div className="card-body row g-2">
            <div className="col-6 col-md-2">
              <label className="form-label small">자재코드</label>
              <input className="form-control form-control-sm bg-light" value={editing.code} readOnly tabIndex={-1} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">구분</label>
              <input className="form-control form-control-sm bg-light" readOnly tabIndex={-1}
                value={editing.form.type === 'RAW' ? '원재료' : '포장재'} title="자재코드가 구분에 따라 정해지므로 변경할 수 없습니다" />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small">자재명</label>
              <input className="form-control form-control-sm" value={editing.form.name} required
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} />
            </div>
            <div className="col-4 col-md-1">
              <label className="form-label small">단위</label>
              <input className="form-control form-control-sm" value={editing.form.unit} required
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, unit: e.target.value } })} />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small">단가(원)</label>
              <input type="number" step="any" min={0} className="form-control form-control-sm text-end" value={editing.form.unitPrice} required
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, unitPrice: Number(e.target.value) } })} />
            </div>
            <div className="col-4 col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input id="mat-active" type="checkbox" className="form-check-input" checked={editing.form.active}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, active: e.target.checked } })} />
                <label htmlFor="mat-active" className="form-check-label small">사용</label>
              </div>
            </div>
          </div>
          <div className="card-footer bg-white d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-sm btn-light" onClick={() => setEditing(null)}>취소</button>
            <button className="btn btn-sm btn-brand" disabled={busy}>저장</button>
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
