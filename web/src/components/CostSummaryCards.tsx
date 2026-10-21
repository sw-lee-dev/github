import { fmtInt, fmtPct, fmtWon } from '../utils/format';

interface Props {
  materialCost: number;
  packagingCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  salePrice: number;
  marginRate: number | null;
  productionQty: number;
}

/** 원가 구성 요약: 총원가/개당원가/마진율 + 항목별 비중 막대 */
export default function CostSummaryCards(p: Props) {
  const parts = [
    { label: '원재료비', value: p.materialCost, cls: 'bar-raw', fmt: fmtWon },
    { label: '포장재비', value: p.packagingCost, cls: 'bar-pack', fmt: fmtWon },
    { label: '노무비', value: p.laborCost, cls: 'bar-labor', fmt: fmtInt },
    { label: '제조경비', value: p.overheadCost, cls: 'bar-overhead', fmt: fmtInt },
  ];
  const total = p.totalCost || 1;
  const marginCls = p.marginRate == null ? '' : p.marginRate < 20 ? 'text-danger' : 'text-success';

  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body">
        <div className="row g-3 text-center text-md-start">
          <div className="col-6 col-md-3">
            <div className="kpi-label">총원가 (배치 {fmtInt(p.productionQty)}개)</div>
            <div className="kpi-value">{fmtWon(p.totalCost)}<small>원</small></div>
          </div>
          <div className="col-6 col-md-3">
            <div className="kpi-label">개당 원가</div>
            <div className="kpi-value">{fmtWon(p.unitCost)}<small>원</small></div>
          </div>
          <div className="col-6 col-md-3">
            <div className="kpi-label">판매가</div>
            <div className="kpi-value">{fmtInt(p.salePrice)}<small>원</small></div>
          </div>
          <div className="col-6 col-md-3">
            <div className="kpi-label">마진율</div>
            <div className={`kpi-value ${marginCls}`}>{fmtPct(p.marginRate)}</div>
          </div>
        </div>

        <div className="cost-bar mt-3" aria-hidden="true">
          {parts.map((x) => (
            <div key={x.label} className={x.cls} style={{ width: `${(x.value / total) * 100}%` }} />
          ))}
        </div>
        <div className="d-flex flex-wrap gap-3 mt-2 small">
          {parts.map((x) => (
            <span key={x.label}>
              <span className={`legend-dot ${x.cls}`} />
              {x.label} <strong>{x.fmt(x.value)}</strong>원
              <span className="text-muted"> ({((x.value / total) * 100).toFixed(1)}%)</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
