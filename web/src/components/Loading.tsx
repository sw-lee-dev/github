export function Loading() {
  return (
    <div className="text-center text-muted py-5">
      <div className="spinner-border spinner-border-sm me-2" role="status" />
      불러오는 중...
    </div>
  );
}

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger py-2" role="alert" style={{ whiteSpace: 'pre-line' }}>
      <i className="bi bi-exclamation-triangle me-2" />
      {message}
    </div>
  );
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
