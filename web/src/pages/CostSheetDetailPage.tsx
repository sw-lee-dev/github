import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CostSheetDetail, CostSheetItem } from '../api/types';
import ApprovalLine from '../components/ApprovalLine';
import CostSummaryCards from '../components/CostSummaryCards';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';
import { fmtDateTime, fmtInt, fmtNum, fmtWeight, fmtWon } from '../utils/format';

type Decision = 'approve' | 'reject' | null;

export default function CostSheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<CostSheetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    api.costSheet(Number(id)).then(setSheet).catch((e) => setError(errMsg(e)));
  }, [id]);

  const run = async (fn: () => Promise<CostSheetDetail | void>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (res) setSheet(res);
      setDecision(null);
      setComment('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!sheet) return error ? <ErrorAlert message={error} /> : <Loading />;
  const p = sheet.permissions;

  const remove = () =>
    run(async () => {
      await api.deleteCostSheet(sheet.id);
      navigate('/', { replace: true });
    }, '이 원가계산서를 삭제할까요?');

  const decide = () => {
    if (decision === 'reject' && !comment.trim()) {
      setError('반려 사유를 입력하세요.');
      return;
    }
    run(() => (decision === 'approve' ? api.approve(sheet.id, comment) : api.reject(sheet.id, comment)));
  };

  return (
    <div className={p.canApprove ? 'has-action-bar' : ''}>
      <div className="mb-2">
        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => navigate(-1)}>
          <i className="bi bi-chevron-left" /> 뒤로
        </button>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <div className="small text-muted">{sheet.docNo}</div>
          <h1 className="h4 mb-1">{sheet.title}</h1>
          <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
            <StatusBadge status={sheet.status} label={sheet.statusLabel} />
            <span>작성 {sheet.writerName}</span>
            <span>· {fmtDateTime(sheet.createdAt)}</span>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {p.canEdit && (
            <Link to={`/cost-sheets/${sheet.id}/edit`} className="btn btn-outline-secondary">
              <i className="bi bi-pencil me-1" />수정
            </Link>
          )}
          {p.canDelete && (
            <button className="btn btn-outline-danger" disabled={busy} onClick={remove}>
              <i className="bi bi-trash me-1" />삭제
            </button>
          )}
          {p.canWithdraw && (
            <button className="btn btn-outline-warning" disabled={busy}
              onClick={() => run(() => api.withdraw(sheet.id), '결재를 회수할까요? 임시저장 상태로 돌아갑니다.')}>
              <i className="bi bi-arrow-counterclockwise me-1" />회수
            </button>
          )}
          {p.canSubmit && (
            <button className="btn btn-brand" disabled={busy}
              onClick={() => run(() => api.submit(sheet.id), '결재를 상신할까요? 상신 후에는 수정할 수 없습니다.')}>
              <i className="bi bi-send me-1" />결재 상신
            </button>
          )}
          {p.canApprove && (
            <div className="d-none d-md-flex gap-2">
              <button className="btn btn-success" onClick={() => setDecision('approve')}>
                <i className="bi bi-check-lg me-1" />승인
              </button>
              <button className="btn btn-danger" onClick={() => setDecision('reject')}>
                <i className="bi bi-x-lg me-1" />반려
              </button>
            </div>
          )}
        </div>
      </div>

      <ErrorAlert message={error} />

      {decision && (
        <div className={`card mb-3 border-${decision === 'approve' ? 'success' : 'danger'}`}>
          <div className="card-body">
            <label htmlFor="comment" className="form-label fw-semibold">
              {decision === 'approve' ? '승인 의견 (선택)' : '반려 사유 (필수)'}
            </label>
            <textarea id="comment" className="form-control mb-2" rows={3} value={comment} autoFocus
              onChange={(e) => setComment(e.target.value)}
              placeholder={decision === 'reject' ? '예) 노무비 산정 근거를 첨부해 주세요.' : ''} />
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-light" onClick={() => { setDecision(null); setComment(''); }}>취소</button>
              <button className={`btn btn-${decision === 'approve' ? 'success' : 'danger'}`} disabled={busy} onClick={decide}>
                {busy && <span className="spinner-border spinner-border-sm me-2" />}
                {decision === 'approve' ? '승인' : '반려'} 확정
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">결재선</div>
        <div className="card-body">
          <ApprovalLine writerName={sheet.writerName} steps={sheet.steps} />
          {sheet.steps.filter((s) => s.comment).map((s) => (
            <div key={s.id} className={`small mt-2 p-2 rounded ${s.status === 'REJECTED' ? 'bg-danger-subtle' : 'bg-light'}`}>
              <strong>{s.approverName}</strong>: {s.comment}
            </div>
          ))}
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">기본 정보</div>
        <div className="card-body">
          <dl className="row mb-0 small">
            <dt className="col-4 col-md-2 text-muted fw-normal">제품</dt>
            <dd className="col-8 col-md-4">{sheet.productName} <span className="text-muted">({sheet.productCode}{sheet.productSpec ? `, ${sheet.productSpec}` : ''})</span></dd>
            <dt className="col-4 col-md-2 text-muted fw-normal">배치 생산수량</dt>
            <dd className="col-8 col-md-4">{fmtInt(sheet.productionQty)}개</dd>
            <dt className="col-4 col-md-2 text-muted fw-normal">제품 당 무게</dt>
            <dd className="col-8 col-md-4">{fmtWeight(sheet.unitWeight)}g</dd>
            <dt className="col-4 col-md-2 text-muted fw-normal">총 생산량</dt>
            <dd className="col-8 col-md-4 fw-semibold">{fmtInt(sheet.totalOutput)}kg</dd>
            <dt className="col-4 col-md-2 text-muted fw-normal">상신일시</dt>
            <dd className="col-8 col-md-4">{fmtDateTime(sheet.submittedAt)}</dd>
            <dt className="col-4 col-md-2 text-muted fw-normal">완료일시</dt>
            <dd className="col-8 col-md-4">{fmtDateTime(sheet.completedAt)}</dd>
            {sheet.remark && (
              <>
                <dt className="col-4 col-md-2 text-muted fw-normal">비고</dt>
                <dd className="col-8 col-md-10 mb-0" style={{ whiteSpace: 'pre-wrap' }}>{sheet.remark}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <CostSummaryCards {...sheet} />

      <ItemTable title="원자재" raw items={sheet.items.filter((i) => i.materialType === 'RAW')} total={sheet.materialCost} />
      <ItemTable title="포장자재" items={sheet.items.filter((i) => i.materialType === 'PACKAGING')} total={sheet.packagingCost} />

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">결재 이력</div>
        <ul className="list-group list-group-flush">
          {sheet.histories.length === 0 && <li className="list-group-item small text-muted">아직 이력이 없습니다.</li>}
          {sheet.histories.map((h) => (
            <li key={h.id} className="list-group-item small">
              <div className="d-flex justify-content-between">
                <span><strong>{h.actorName}</strong> · {h.actionLabel}</span>
                <span className="text-muted">{fmtDateTime(h.actedAt)}</span>
              </div>
              {h.comment && <div className="text-muted mt-1">{h.comment}</div>}
            </li>
          ))}
        </ul>
      </div>

      {p.canApprove && !decision && (
        <div className="action-bar d-md-none">
          <button className="btn btn-danger flex-fill" onClick={() => setDecision('reject')}>
            <i className="bi bi-x-lg me-1" />반려
          </button>
          <button className="btn btn-success flex-fill" onClick={() => { setDecision('approve'); window.scrollTo({ top: 0 }); }}>
            <i className="bi bi-check-lg me-1" />승인
          </button>
        </div>
      )}
    </div>
  );
}

/** 원자재(raw)는 배합비 열을 추가로 보여준다. */
function ItemTable({ title, items, total, raw = false }: { title: string; items: CostSheetItem[]; total: number; raw?: boolean }) {
  if (items.length === 0) return null;
  const ratioSum = items.reduce((acc, i) => acc + (i.ratio ?? 0), 0);
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header bg-white d-flex justify-content-between">
        <span className="fw-semibold">{title}</span>
        <span className="small">합계 <strong>{fmtWon(total)}</strong>원</span>
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0 small">
          <thead className="table-light">
            <tr>
              <th>자재명</th>
              {raw && <th className="text-end">배합비</th>}
              <th className="text-end">손실률</th>
              <th className="text-end">투입량</th>
              <th className="text-end">단가</th>
              <th className="text-end">금액</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.materialName}</td>
                {raw && <td className="text-end">{fmtNum(i.ratio)}%</td>}
                <td className="text-end">{fmtNum(i.lossRate)}%</td>
                <td className="text-end text-nowrap">{raw ? fmtWeight(i.quantity) : fmtNum(i.quantity)} {i.unit}</td>
                <td className="text-end text-nowrap">{fmtWon(i.unitPrice)}</td>
                <td className="text-end text-nowrap fw-medium">{fmtWon(i.amount)}</td>
              </tr>
            ))}
          </tbody>
          {raw && (
            <tfoot className="table-light">
              <tr>
                <td>배합비 합계</td>
                <td className="text-end fw-semibold">{fmtNum(Math.round(ratioSum * 1000) / 1000)}%</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {raw && <div className="card-footer bg-white small text-muted">투입량 = 총 생산량 × 배합비% ÷ (1 − 손실률%)</div>}
    </div>
  );
}
