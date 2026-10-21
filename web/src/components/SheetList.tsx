import { Link } from 'react-router-dom';
import type { CostSheetSummary } from '../api/types';
import { fmtDate, fmtPct, fmtWon } from '../utils/format';
import { StatusBadge } from './StatusBadge';

/** 원가계산서 목록. PC는 표, 모바일은 카드로 보여준다. */
export default function SheetList({ rows, empty }: { rows: CostSheetSummary[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-muted py-5 border rounded bg-white">
        <i className="bi bi-inbox fs-2 d-block mb-2" />
        {empty}
      </div>
    );
  }

  return (
    <>
      <div className="table-responsive d-none d-md-block bg-white border rounded">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>문서번호</th>
              <th>제목</th>
              <th>제품</th>
              <th>작성자</th>
              <th className="text-end">개당원가</th>
              <th className="text-end">마진율</th>
              <th>상태</th>
              <th>현재 결재자</th>
              <th>수정일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-nowrap small text-muted">{r.docNo}</td>
                <td>
                  <Link to={`/cost-sheets/${r.id}`} className="fw-medium text-decoration-none">
                    {r.title}
                  </Link>
                </td>
                <td className="text-nowrap">{r.productName}</td>
                <td className="text-nowrap">{r.writerName}</td>
                <td className="text-end text-nowrap">{fmtWon(r.unitCost)}원</td>
                <td className="text-end">{fmtPct(r.marginRate)}</td>
                <td>
                  <StatusBadge status={r.status} label={r.statusLabel} />
                </td>
                <td className="text-nowrap">{r.currentApproverName ?? '-'}</td>
                <td className="text-nowrap small">{fmtDate(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-md-none vstack gap-2">
        {rows.map((r) => (
          <Link key={r.id} to={`/cost-sheets/${r.id}`} className="card text-decoration-none text-body shadow-sm">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-start mb-1">
                <span className="small text-muted">{r.docNo}</span>
                <StatusBadge status={r.status} label={r.statusLabel} />
              </div>
              <div className="fw-semibold mb-1">{r.title}</div>
              <div className="small text-muted mb-2">
                {r.productName} · {r.writerName}
                {r.currentApproverName && <> · 결재자 {r.currentApproverName}</>}
              </div>
              <div className="d-flex justify-content-between small">
                <span>총원가 {fmtWon(r.totalCost)}원</span>
                <span>
                  개당 <strong>{fmtWon(r.unitCost)}원</strong> · 마진 {fmtPct(r.marginRate)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
