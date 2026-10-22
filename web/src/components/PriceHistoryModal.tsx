import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PriceHistory, Product } from '../api/types';
import { ErrorAlert, Loading, errMsg } from './Loading';
import { fmtDate, fmtInt } from '../utils/format';

/** 제품 판매가 이력 팝업: 원가계산서가 최종 승인될 때마다 책정된 판매가를 최신순으로 보여준다 */
export default function PriceHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [rows, setRows] = useState<PriceHistory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.priceHistory(product.id).then(setRows).catch((e) => setError(errMsg(e)));
  }, [product.id]);

  // 열려 있는 동안 배경 스크롤을 막고 Esc 로 닫는다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <div className="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby="price-history-title"
        tabIndex={-1} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="price-history-title" className="modal-title fs-6">
                판매가 이력 <span className="text-muted fw-normal ms-1">{product.code}</span>
              </h2>
              <button type="button" className="btn-close" aria-label="닫기" onClick={onClose} />
            </div>
            <div className="modal-body p-0">
              <ErrorAlert message={error} />
              {!rows && !error ? <Loading /> : rows && (
                <table className="table table-sm align-middle mb-0" data-testid="price-history">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">제품명</th>
                      <th className="text-end">판매가(원)</th>
                      <th className="text-center pe-3">결재승인일자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-muted py-4">승인된 판매가가 없습니다.</td></tr>
                    ) : rows.map((r) => (
                      <tr key={r.costSheetId}>
                        <td className="ps-3">{r.productName}</td>
                        <td className="text-end">{fmtInt(r.salePrice)}</td>
                        <td className="text-center pe-3">{fmtDate(r.approvedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-light" onClick={onClose}>닫기</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
