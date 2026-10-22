import { useEffect, useState, type FormEvent } from 'react';

export interface GravityRow {
  key: number;
  name: string;
  unit: string;
  value: number | null;
}

/**
 * kg 이 아닌 단위의 원재료 비중 입력 팝업.
 * 비중 = 1 단위당 kg (예: 흰우유 1 L = 1.03 kg). 원가계산서의 원자재 투입량 합계를 kg 으로 환산할 때 쓴다.
 */
export default function GravityModal({ rows, busy, onConfirm, onCancel }: {
  rows: GravityRow[];
  busy?: boolean;
  onConfirm: (values: Map<number, number>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(() => new Map(rows.map((r) => [r.key, r.value == null ? '' : String(r.value)])));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(new Map(rows.map((r) => [r.key, Number(values.get(r.key))])));
  };

  return (
    <>
      <div className="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby="gravity-title" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content" onSubmit={submit} data-testid="gravity-modal">
            <div className="modal-header">
              <h2 id="gravity-title" className="modal-title fs-6">비중 입력</h2>
              <button type="button" className="btn-close" aria-label="닫기" onClick={onCancel} />
            </div>
            <div className="modal-body">
              <p className="small text-muted mb-2">
                kg 단위가 아닌 원재료는 원가계산서의 투입량 합계를 kg 으로 환산할 비중이 필요합니다.
              </p>
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr><th>자재명</th><th className="text-center">비중 (1 단위당 kg)</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.key}>
                      <td>{r.name || '(자재명 없음)'}</td>
                      <td>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text">1 {r.unit} =</span>
                          <input type="number" step="0.0001" min="0.0001" required className="form-control text-end"
                            aria-label={`${r.name} 비중`} autoFocus={idx === 0} value={values.get(r.key) ?? ''}
                            onChange={(e) => setValues(new Map(values).set(r.key, e.target.value))} />
                          <span className="input-group-text">kg</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-light" onClick={onCancel}>취소</button>
              <button className="btn btn-sm btn-brand" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-1" />}확인 후 저장
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
