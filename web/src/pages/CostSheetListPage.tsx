import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { CostSheetSummary, CostStatus } from '../api/types';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import SheetList from '../components/SheetList';

const STATUS_OPTIONS: { value: CostStatus | ''; label: string }[] = [
  { value: '', label: '전체 상태' },
  { value: 'DRAFT', label: '임시저장' },
  { value: 'IN_APPROVAL', label: '결재중' },
  { value: 'APPROVED', label: '승인완료' },
  { value: 'REJECTED', label: '반려' },
];

export default function CostSheetListPage() {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<CostStatus | ''>('');
  const [rows, setRows] = useState<CostSheetSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    api.costSheets(scope, status || undefined).then(setRows).catch((e) => setError(errMsg(e)));
  }, [scope, status]);

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h4 mb-0">원가계산서</h1>
        <Link to="/cost-sheets/new" className="btn btn-brand">
          <i className="bi bi-plus-lg me-1" />새 원가계산서
        </Link>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="btn-group" role="group">
          <button className={`btn btn-sm ${scope === 'mine' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setScope('mine')}>
            내가 작성한 문서
          </button>
          <button className={`btn btn-sm ${scope === 'all' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setScope('all')}>
            전체 문서
          </button>
        </div>
        <select className="form-select form-select-sm w-auto" value={status}
          onChange={(e) => setStatus(e.target.value as CostStatus | '')} aria-label="상태 필터">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <ErrorAlert message={error} />
      {rows ? <SheetList rows={rows} empty="조건에 맞는 원가계산서가 없습니다." /> : !error && <Loading />}
    </>
  );
}
