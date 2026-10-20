import type { ApprovalStep } from '../api/types';
import { fmtDateTime } from '../utils/format';
import { StepBadge } from './StatusBadge';

/** 결재선 도장칸 스타일 표시 */
export default function ApprovalLine({ writerName, steps }: { writerName: string; steps: ApprovalStep[] }) {
  return (
    <div className="approval-line">
      <div className="approval-cell">
        <div className="approval-role">작성</div>
        <div className="approval-name">{writerName}</div>
        <span className="badge text-bg-light border">기안</span>
      </div>
      {steps.map((s) => (
        <div key={s.id} className={`approval-cell step-${s.status.toLowerCase()}`}>
          <div className="approval-role">{s.seq}차 결재</div>
          <div className="approval-name">{s.approverName}</div>
          <StepBadge status={s.status} label={s.statusLabel} />
          {s.actedAt && <div className="approval-time">{fmtDateTime(s.actedAt)}</div>}
        </div>
      ))}
    </div>
  );
}
