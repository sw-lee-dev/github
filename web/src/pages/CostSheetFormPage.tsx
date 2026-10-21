import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CostSheetSaveRequest, Material, Product, User } from '../api/types';
import CostSummaryCards from '../components/CostSummaryCards';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import { calcCost, packagingAmount, rawAmount, rawMaterialCost, rawQuantity, totalInputKg, totalOutputKg } from '../utils/cost';
import { fmtInt, fmtNum, fmtWeight, fmtWon } from '../utils/format';

/** 원자재: 배합비(%)로 입력, 투입량은 총 생산량 × 배합비로 자동 계산 (손실은 기본정보의 원재료 손실률로 반영) */
interface RawRow {
  key: number;
  materialId: string;
  ratio: string;
  unitPrice: string;
}

/** 포장자재: 투입량 직접 입력 */
interface PackRow {
  key: number;
  materialId: string;
  quantity: string;
  lossRate: string;
  unitPrice: string;
}

type TabKey = 'basic' | 'bom' | 'approval';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본정보' },
  { key: 'bom', label: '배합비' },
  { key: 'approval', label: '결재선' },
];

let rowSeq = 0;
const newRawRow = (): RawRow => ({ key: ++rowSeq, materialId: '', ratio: '', unitPrice: '' });
const newPackRow = (): PackRow => ({ key: ++rowSeq, materialId: '', quantity: '', lossRate: '0', unitPrice: '' });
const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

export default function CostSheetFormPage() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState('');
  const [productionQty, setProductionQty] = useState('');
  const [rawLossRate, setRawLossRate] = useState('0');
  const [salePrice, setSalePrice] = useState('');
  const [laborCost, setLaborCost] = useState('0');
  const [overheadCost, setOverheadCost] = useState('0');
  const [remark, setRemark] = useState('');
  const [rawRows, setRawRows] = useState<RawRow[]>([newRawRow()]);
  const [packRows, setPackRows] = useState<PackRow[]>([newPackRow()]);
  const [approverIds, setApproverIds] = useState<number[]>([]);
  const [approverToAdd, setApproverToAdd] = useState('');
  const [tab, setTab] = useState<TabKey>('basic');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const load = async () => {
      const [m, p, a] = await Promise.all([api.materials(), api.products(), api.approvers()]);
      setMaterials(m);
      setProducts(p);
      setApprovers(a);
      if (editId) {
        const s = await api.costSheet(editId);
        if (!s.permissions.canEdit) throw new Error(`${s.statusLabel} 상태의 문서는 수정할 수 없습니다.`);
        setTitle(s.title);
        setProductId(String(s.productId));
        setProductionQty(String(s.productionQty));
        setRawLossRate(String(s.rawLossRate));
        setSalePrice(String(s.salePrice));
        setLaborCost(String(s.laborCost));
        setOverheadCost(String(s.overheadCost));
        setRemark(s.remark ?? '');
        setRawRows(s.items.filter((i) => i.materialType === 'RAW').map((i) => ({
          key: ++rowSeq,
          materialId: String(i.materialId),
          ratio: i.ratio == null ? '' : Number(i.ratio).toFixed(2),
          unitPrice: Number(i.unitPrice).toFixed(2),
        })));
        setPackRows(s.items.filter((i) => i.materialType === 'PACKAGING').map((i) => ({
          key: ++rowSeq,
          materialId: String(i.materialId),
          quantity: String(i.quantity),
          lossRate: String(i.lossRate),
          unitPrice: Number(i.unitPrice).toFixed(2),
        })));
        setApproverIds(s.steps.map((st) => st.approverId));
      }
    };
    load().then(() => setLoaded(true)).catch((e) => { setError(errMsg(e)); setLoaded(true); });
  }, [editId]);

  const materialById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const product = products.find((x) => x.id === Number(productId));
  const totalKg = totalOutputKg(product?.unitWeight ?? 0, num(productionQty));
  const totalInput = totalInputKg(totalKg, num(rawLossRate));

  // 원자재 행별 투입량/금액, 포장자재 행별 금액
  const rawCalc = useMemo(() => rawRows.map((r) => {
    const unit = materialById.get(Number(r.materialId))?.unit ?? 'kg';
    const quantity = r.materialId ? rawQuantity(totalKg, num(r.ratio), unit) : 0;
    return { unit, quantity, amount: rawAmount(quantity, num(r.unitPrice)) };
  }), [rawRows, materialById, totalKg]);
  const packCalc = useMemo(() => packRows.map((r) => ({
    unit: materialById.get(Number(r.materialId))?.unit ?? '단위',
    amount: r.materialId ? packagingAmount(num(r.quantity), num(r.unitPrice), num(r.lossRate)) : 0,
  })), [packRows, materialById]);

  const ratioSum = Math.round(rawRows.filter((r) => r.materialId).reduce((acc, r) => acc + num(r.ratio), 0) * 1000) / 1000;
  const rawSubtotal = Math.round(rawCalc.reduce((acc, c) => acc + c.amount, 0) * 100) / 100;
  const materialCost = rawMaterialCost(rawSubtotal, num(rawLossRate));
  const packagingCost = packCalc.reduce((acc, c) => acc + c.amount, 0);
  const preview = calcCost(materialCost, packagingCost, num(laborCost), num(overheadCost), num(productionQty), num(salePrice));

  const updateRaw = (key: number, patch: Partial<RawRow>) =>
    setRawRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const updatePack = (key: number, patch: Partial<PackRow>) =>
    setPackRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const priceOf = (materialId: string) => {
    const m = materialById.get(Number(materialId));
    return m ? Number(m.unitPrice).toFixed(2) : '';
  };

  const selectProduct = (value: string) => {
    setProductId(value);
    const prod = products.find((x) => x.id === Number(value));
    if (prod) {
      setSalePrice(String(prod.salePrice));
      if (!title.trim()) setTitle(`${prod.name} 제조원가`);
    }
  };

  const approverById = useMemo(() => new Map(approvers.map((u) => [u.id, u])), [approvers]);

  const moveApprover = (idx: number, dir: -1 | 1) =>
    setApproverIds((ids) => {
      const next = [...ids];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return ids;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const buildRequest = (): CostSheetSaveRequest => ({
    title: title.trim(),
    productId: Number(productId),
    productionQty: num(productionQty),
    rawLossRate: num(rawLossRate),
    salePrice: num(salePrice),
    laborCost: num(laborCost),
    overheadCost: num(overheadCost),
    remark: remark.trim() || null,
    items: [
      ...rawRows.filter((r) => r.materialId).map((r) => ({
        materialId: Number(r.materialId),
        ratio: num(r.ratio),
        quantity: null,
        unitPrice: r.unitPrice.trim() === '' ? null : num(r.unitPrice),
        lossRate: null,
      })),
      ...packRows.filter((r) => r.materialId).map((r) => ({
        materialId: Number(r.materialId),
        ratio: null,
        quantity: num(r.quantity),
        unitPrice: r.unitPrice.trim() === '' ? null : num(r.unitPrice),
        lossRate: num(r.lossRate),
      })),
    ],
    approverIds,
  });

  /**
   * 필수 입력 검사. 숨겨진 탭의 칸은 브라우저가 알려주지 못하므로,
   * 처음 비어 있는 칸이 있는 탭으로 이동한 뒤 브라우저 안내를 띄운다.
   */
  const validate = () => {
    const form = formRef.current;
    if (!form || form.checkValidity()) return true;
    const invalid = form.querySelector<HTMLElement>(':invalid');
    const pane = invalid?.closest<HTMLElement>('[data-tab]')?.dataset.tab as TabKey | undefined;
    if (pane) setTab(pane);
    setTimeout(() => form.reportValidity(), 50);
    return false;
  };

  /** 상신에 필요한 값(서버 CostSheet.submit 과 같은 조건). 빠진 항목과 해당 탭을 돌려준다. */
  const submitProblems = (): { tab: TabKey; msg: string }[] => {
    const problems: { tab: TabKey; msg: string }[] = [];
    if (!rawRows.some((r) => r.materialId) && !packRows.some((r) => r.materialId)) {
      problems.push({ tab: 'bom', msg: '배합비: 원자재 또는 포장자재를 1개 이상 입력하세요.' });
    }
    if (approverIds.length === 0) {
      problems.push({ tab: 'approval', msg: '결재선: 결재자를 1명 이상 지정하세요.' });
    }
    return problems;
  };

  const save = async (submitAfter: boolean) => {
    setError(null);
    if (!validate()) return;
    if (submitAfter) {
      const problems = submitProblems();
      if (problems.length > 0) {
        // 저장하지 않고 빠진 항목을 알려준 뒤 첫 번째 항목의 탭으로 이동
        setError(['상신하려면 다음 항목을 입력하세요. (저장되지 않았습니다)', ...problems.map((p) => `• ${p.msg}`)].join('\n'));
        setTab(problems[0].tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!window.confirm('저장 후 바로 결재를 상신할까요? 상신 후에는 수정할 수 없습니다.')) return;
    }
    setBusy(true);
    try {
      // 저장과 상신을 서버에서 한 트랜잭션으로 처리 → 상신이 실패하면 저장도 되지 않는다
      const body = buildRequest();
      const saved = editId ? await api.updateCostSheet(editId, body, submitAfter) : await api.createCostSheet(body, submitAfter);
      navigate(`/cost-sheets/${saved.id}`, { replace: true });
    } catch (e) {
      setError(errMsg(e));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(false);
  };

  if (!loaded) return <Loading />;

  /**
   * 행별 자재 선택지. 같은 구역의 다른 행에서 이미 고른 자재는 빼고, 자기 행에서 고른 자재는 남긴다.
   * (사용 중지된 자재라도 이미 선택된 값이면 표시)
   */
  const usedRaw = new Set(rawRows.map((r) => r.materialId).filter(Boolean));
  const usedPack = new Set(packRows.map((r) => r.materialId).filter(Boolean));
  const optionsFor = (type: Material['type'], used: Set<string>, current: string) =>
    materials.filter((m) => {
      const id = String(m.id);
      if (m.type !== type) return false;
      if (id === current) return true;
      return m.active && !used.has(id);
    });
  const rawLeft = optionsFor('RAW', usedRaw, '').length;
  const packLeft = optionsFor('PACKAGING', usedPack, '').length;
  const selectableApprovers = approvers.filter((u) => !approverIds.includes(u.id));
  const ratioOk = Math.abs(ratioSum - 100) < 0.0005;
  const hasRaw = rawRows.some((r) => r.materialId);
  const tabIdx = TABS.findIndex((t) => t.key === tab);
  const pane = (key: TabKey) => ({ 'data-tab': key, role: 'tabpanel', className: tab === key ? '' : 'd-none' });

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <h1 className="h4 mb-3">{editId ? '원가계산서 수정' : '새 원가계산서'}</h1>
      <ErrorAlert message={error} />

      <ul className="nav nav-tabs" role="tablist">
        {TABS.map((t) => (
          <li key={t.key} className="nav-item" role="presentation">
            <button type="button" role="tab" aria-selected={tab === t.key}
              className={`nav-link ${tab === t.key ? 'active fw-semibold' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'bom' && hasRaw && !ratioOk && (
                <i className="bi bi-exclamation-triangle-fill text-warning ms-1" title="배합비 합계가 100%가 아닙니다" />
              )}
              {t.key === 'approval' && (
                <span className={`badge rounded-pill ms-1 ${approverIds.length ? 'text-bg-primary' : 'text-bg-secondary'}`}>{approverIds.length}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div {...pane('basic')}>
      <div className="card shadow-sm mb-3 tab-card">
        <div className="card-body row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="product">제품 *</label>
            <select id="product" className="form-select" value={productId} onChange={(e) => selectProduct(e.target.value)} required>
              <option value="">선택하세요</option>
              {products.filter((p) => p.active || String(p.id) === productId).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name} {p.spec ? `(${p.spec})` : ''} · {fmtInt(p.unitWeight)}g
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="title">제목 *</label>
            <input id="title" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="qty">배치 생산수량(개) *</label>
            <input id="qty" type="number" min={1} className="form-control text-end" value={productionQty}
              onChange={(e) => setProductionQty(e.target.value)} required />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="sale">개당 판매가(원) *</label>
            <input id="sale" type="number" min={0} className="form-control text-end" value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)} required />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="labor">노무비(원/배치)</label>
            <input id="labor" type="number" min={0} className="form-control text-end" value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)} required />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="overhead">제조경비(원/배치)</label>
            <input id="overhead" type="number" min={0} className="form-control text-end" value={overheadCost}
              onChange={(e) => setOverheadCost(e.target.value)} required />
            <div className="form-text">전력·가스·감가상각 등</div>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="totalOutput">총 생산량 (자동 계산)</label>
            <div className="input-group">
              <input id="totalOutput" className="form-control text-end fw-semibold bg-light" readOnly tabIndex={-1}
                value={product && num(productionQty) > 0 ? fmtInt(totalKg) : ''} placeholder="제품과 배치 생산수량을 입력하세요" />
              <span className="input-group-text">kg</span>
            </div>
            {product && num(productionQty) > 0 && (
              <div className="form-text">
                제품 당 무게 {fmtInt(product.unitWeight)}g × 배치 생산수량 {fmtInt(num(productionQty))}개
              </div>
            )}
          </div>
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="rawLoss">원재료 손실률(%) *</label>
            <div className="input-group">
              <input id="rawLoss" type="number" step="any" min={0} max={99.99} className="form-control text-end" required
                value={rawLossRate} onChange={(e) => setRawLossRate(e.target.value)} />
              <span className="input-group-text">%</span>
            </div>
            <div className="form-text">세척·가열·불량 등 원재료 손실분 (100% 미만)</div>
          </div>
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="totalInput">총 투입량 (자동 계산)</label>
            <div className="input-group">
              <input id="totalInput" className="form-control text-end fw-semibold bg-light" readOnly tabIndex={-1}
                value={product && num(productionQty) > 0 ? fmtWeight(totalInput) : ''} />
              <span className="input-group-text">kg</span>
            </div>
            <div className="form-text">총 생산량 ÷ (1 − 원재료 손실률%)</div>
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="remark">비고 (변경 사유 등)</label>
            <textarea id="remark" className="form-control" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={2000} />
          </div>
        </div>
      </div>

      </div>

      <div {...pane('bom')}>
      <div className="card shadow-sm mb-3 tab-card">
        <div className="card-body p-2 p-md-3 vstack gap-4">
          <section aria-labelledby="raw-title">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 id="raw-title" className="h6 mb-0">원자재</h2>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={rawLeft === 0}
                title={rawLeft === 0 ? '추가할 수 있는 원자재가 없습니다' : undefined} onClick={() => setRawRows((r) => [...r, newRawRow()])}>
                <i className="bi bi-plus-lg me-1" />행 추가
              </button>
            </div>
            <div className="bom-row bom-raw bom-head d-none d-md-grid" aria-hidden="true">
              <span>자재</span><span className="text-end">배합비(%)</span>
              <span className="text-end">투입량</span><span className="text-end">단가(원)</span><span className="text-end">금액(원)</span><span />
            </div>
            <div className="vstack gap-2">
              {rawRows.map((r, idx) => (
                <div key={r.key} className="bom-row bom-raw">
                  <label className="bom-cell bom-material">
                    <span className="cell-label">자재</span>
                    <select className="form-select form-select-sm" aria-label="원자재" value={r.materialId}
                      onChange={(e) => updateRaw(r.key, { materialId: e.target.value, unitPrice: priceOf(e.target.value) })}>
                      <option value="">원자재 선택</option>
                      {optionsFor('RAW', usedRaw, r.materialId).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}
                    </select>
                  </label>
                  <label className="bom-cell">
                    <span className="cell-label">배합비(%)</span>
                    <input type="number" step="0.01" min={0} max={100} className="form-control form-control-sm text-end" aria-label="배합비" required={!!r.materialId}
                      value={r.ratio} onChange={(e) => updateRaw(r.key, { ratio: e.target.value })}
                      onBlur={(e) => e.target.value.trim() !== '' && updateRaw(r.key, { ratio: Number(e.target.value).toFixed(2) })} />
                  </label>
                  <label className="bom-cell">
                    <span className="cell-label">투입량</span>
                    <div className="input-group input-group-sm">
                      <input className="form-control text-end bg-light" readOnly tabIndex={-1} aria-label="투입량(자동)"
                        value={r.materialId ? fmtWeight(rawCalc[idx].quantity) : ''} />
                      <span className="input-group-text unit-label">{rawCalc[idx].unit}</span>
                    </div>
                  </label>
                  <label className="bom-cell">
                    <span className="cell-label">단가(원)</span>
                    <input type="number" step="0.01" min={0} className="form-control form-control-sm text-end" aria-label="단가"
                      value={r.unitPrice} onChange={(e) => updateRaw(r.key, { unitPrice: e.target.value })} />
                  </label>
                  <div className="bom-cell text-end fw-medium small">
                    <span className="cell-label">금액(원)</span>{fmtWon(rawCalc[idx].amount)}
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-danger" aria-label="행 삭제"
                    onClick={() => setRawRows((rows) => rows.filter((x) => x.key !== r.key))}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              ))}
            </div>
            {/* 합계 행: 열 위치를 위 입력 행과 맞춘다. 금액 합계는 원재료 손실률을 반영한 최종 원자재비용 */}
            <div className="bom-row bom-raw bom-total" data-testid="raw-total-row">
              <div className="bom-cell bom-material fw-semibold">합계</div>
              <div className={`bom-cell text-end fw-semibold ${ratioOk ? '' : 'text-warning-emphasis'}`}
                title={ratioOk ? undefined : '배합비 합계가 100%가 되도록 입력하세요'}>
                <span className="cell-label">배합비(%)</span>
                <span data-testid="ratio-sum">{ratioSum.toFixed(2)}</span>
              </div>
              <div className="bom-cell d-none d-md-block" />
              <div className="bom-cell d-none d-md-block" />
              <div className="bom-cell text-end fw-semibold" title={`원자재 금액 합계 ${fmtWon(rawSubtotal)}원 ÷ (1 − 원재료 손실률 ${fmtNum(num(rawLossRate))}%)`}>
                <span className="cell-label">금액(원) · 손실률 반영</span>
                <span data-testid="raw-cost">{fmtWon(materialCost)}</span>
              </div>
              <div className="d-none d-md-block" />
            </div>
          </section>

          <section aria-labelledby="pack-title">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 id="pack-title" className="h6 mb-0">포장자재</h2>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={packLeft === 0}
                title={packLeft === 0 ? '추가할 수 있는 포장자재가 없습니다' : undefined} onClick={() => setPackRows((r) => [...r, newPackRow()])}>
                <i className="bi bi-plus-lg me-1" />행 추가
              </button>
            </div>
            <div className="bom-row bom-pack bom-head d-none d-md-grid" aria-hidden="true">
              <span>자재</span><span className="text-end">투입량</span><span className="text-end">손실률(%)</span>
              <span className="text-end">단가(원)</span><span className="text-end">금액(원)</span><span />
            </div>
            <div className="vstack gap-2">
              {packRows.map((r, idx) => (
                <div key={r.key} className="bom-row bom-pack">
                  <label className="bom-cell bom-material">
                    <span className="cell-label">자재</span>
                    <select className="form-select form-select-sm" aria-label="포장자재" value={r.materialId}
                      onChange={(e) => updatePack(r.key, { materialId: e.target.value, unitPrice: priceOf(e.target.value) })}>
                      <option value="">포장자재 선택</option>
                      {optionsFor('PACKAGING', usedPack, r.materialId).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}
                    </select>
                  </label>
                  <label className="bom-cell">
                    <span className="cell-label">투입량</span>
                    <div className="input-group input-group-sm">
                      <input type="number" step="any" min={0} className="form-control text-end" aria-label="투입량" required={!!r.materialId}
                        value={r.quantity} onChange={(e) => updatePack(r.key, { quantity: e.target.value })} />
                      <span className="input-group-text unit-label">{packCalc[idx].unit}</span>
                    </div>
                  </label>
                  <label className="bom-cell">
                    <span className="cell-label">손실률(%)</span>
                    <input type="number" step="any" min={0} max={100} className="form-control form-control-sm text-end" aria-label="손실률"
                      value={r.lossRate} onChange={(e) => updatePack(r.key, { lossRate: e.target.value })} />
                  </label>
                  <label className="bom-cell">
                    <span className="cell-label">단가(원)</span>
                    <input type="number" step="0.01" min={0} className="form-control form-control-sm text-end" aria-label="단가"
                      value={r.unitPrice} onChange={(e) => updatePack(r.key, { unitPrice: e.target.value })} />
                  </label>
                  <div className="bom-cell text-end fw-medium small">
                    <span className="cell-label">금액(원)</span>{fmtWon(packCalc[idx].amount)}
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-danger" aria-label="행 삭제"
                    onClick={() => setPackRows((rows) => rows.filter((x) => x.key !== r.key))}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              ))}
            </div>
            <div className="d-flex justify-content-end mt-2 small">
              <span>포장자재 합계 <strong>{fmtWon(packagingCost)}</strong>원</span>
            </div>
            <div className="form-text">금액 = 투입량 × 단가 × (1 + 손실률%). 단가는 자재 기준단가가 자동으로 들어가며 수정할 수 있습니다.</div>
          </section>
        </div>
      </div>

      </div>

      <div {...pane('approval')}>
      <div className="card shadow-sm mb-3 tab-card">
        <div className="card-body">
          <div className="d-flex gap-2 mb-3">
            <select className="form-select" aria-label="결재자 선택" value={approverToAdd} onChange={(e) => setApproverToAdd(e.target.value)}>
              <option value="">결재자 선택</option>
              {selectableApprovers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} {u.position ?? ''} · {u.department ?? ''}</option>
              ))}
            </select>
            <button type="button" className="btn btn-outline-primary text-nowrap" disabled={!approverToAdd}
              onClick={() => { setApproverIds((ids) => [...ids, Number(approverToAdd)]); setApproverToAdd(''); }}>
              추가
            </button>
          </div>
          {approverIds.length === 0 ? (
            <div className="text-muted small">결재자를 순서대로 추가하세요. (예: 팀장 → 공장장 → 임원)</div>
          ) : (
            <ol className="list-group list-group-numbered">
              {approverIds.map((uid, idx) => {
                const u = approverById.get(uid);
                return (
                  <li key={uid} className="list-group-item d-flex align-items-center gap-2">
                    <span className="flex-grow-1">
                      {u ? `${u.name} ${u.position ?? ''}` : `#${uid}`}
                      <span className="text-muted small ms-2">{u?.department}</span>
                    </span>
                    <button type="button" className="btn btn-sm btn-light" aria-label="위로" onClick={() => moveApprover(idx, -1)} disabled={idx === 0}>
                      <i className="bi bi-arrow-up" />
                    </button>
                    <button type="button" className="btn btn-sm btn-light" aria-label="아래로" onClick={() => moveApprover(idx, 1)} disabled={idx === approverIds.length - 1}>
                      <i className="bi bi-arrow-down" />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" aria-label="제거"
                      onClick={() => setApproverIds((ids) => ids.filter((x) => x !== uid))}>
                      <i className="bi bi-x-lg" />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
      </div>

      <h2 className="h6 text-muted mb-2">원가 미리보기</h2>
      <CostSummaryCards
        materialCost={materialCost}
        packagingCost={packagingCost}
        laborCost={num(laborCost)}
        overheadCost={num(overheadCost)}
        totalCost={preview.totalCost}
        unitCost={preview.unitCost}
        salePrice={num(salePrice)}
        marginRate={preview.marginRate}
        productionQty={num(productionQty)}
      />

      <div className="d-flex flex-wrap gap-2 justify-content-between mb-5">
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary" disabled={tabIdx === 0}
            onClick={() => setTab(TABS[tabIdx - 1].key)}>
            <i className="bi bi-chevron-left" /> 이전
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={tabIdx === TABS.length - 1}
            onClick={() => setTab(TABS[tabIdx + 1].key)}>
            다음 <i className="bi bi-chevron-right" />
          </button>
        </div>
        <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-light" onClick={() => navigate(-1)} disabled={busy}>취소</button>
        <button type="submit" className="btn btn-outline-primary" disabled={busy}>
          <i className="bi bi-save me-1" />임시저장
        </button>
        <button type="button" className="btn btn-brand" disabled={busy} onClick={() => save(true)}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}
          <i className="bi bi-send me-1" />저장 후 상신
        </button>
        </div>
      </div>
    </form>
  );
}
