import type { CostStatus, StepStatus } from '../api/types';

const COST: Record<CostStatus, string> = {
  DRAFT: 'text-bg-secondary',
  IN_APPROVAL: 'text-bg-primary',
  APPROVED: 'text-bg-success',
  REJECTED: 'text-bg-danger',
};

const STEP: Record<StepStatus, string> = {
  WAITING: 'text-bg-light border',
  PENDING: 'text-bg-warning',
  APPROVED: 'text-bg-success',
  REJECTED: 'text-bg-danger',
};

export function StatusBadge({ status, label }: { status: CostStatus; label: string }) {
  return <span className={`badge ${COST[status]}`}>{label}</span>;
}

export function StepBadge({ status, label }: { status: StepStatus; label: string }) {
  return <span className={`badge ${STEP[status]}`}>{label}</span>;
}
