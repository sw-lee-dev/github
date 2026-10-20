import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { CostSheetSummary } from '../api/types';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import SheetList from '../components/SheetList';

export default function ApprovalsPage() {
  const [box, setBox] = useState<'pending' | 'done'>('pending');
  const [rows, setRows] = useState<CostSheetSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    api.approvals(box).then(setRows).catch((e) => setError(errMsg(e)));
  }, [box]);

  return (
    <>
      <h1 className="h4 mb-3">결재함</h1>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${box === 'pending' ? 'active' : ''}`} onClick={() => setBox('pending')}>
            결재 대기
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${box === 'done' ? 'active' : ''}`} onClick={() => setBox('done')}>
            처리 완료
          </button>
        </li>
      </ul>
      <ErrorAlert message={error} />
      {rows ? (
        <SheetList rows={rows} empty={box === 'pending' ? '결재할 문서가 없습니다.' : '처리한 문서가 없습니다.'} />
      ) : (
        !error && <Loading />
      )}
    </>
  );
}
