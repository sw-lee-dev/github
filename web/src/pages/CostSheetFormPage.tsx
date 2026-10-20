import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CostSheetSaveRequest, Material, Product, User } from '../api/types';
import CostSummaryCards from '../components/CostSummaryCards';
import { ErrorAlert, Loading, errMsg } from '../components/Loading';
import { calcCost, lineAmount } from '../utils/cost';
import { fmtWon } from '../utils/format';

interface ItemRow {
  key: number;
  materialId: string;
  quantity: string;
  unitPrice: string;
  lossRate: string;
}

let rowSeq = 0;
const newRow = (): ItemRow => ({ key: ++rowSeq, materialId: '', quantity: '', unitPrice: '', lossRate: '0' });
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
  const [salePrice, setSalePrice] = useState('');
  const [laborCost, setLaborCost] = useState('0');
  const [overheadCost, setOverheadCost] = useState('0');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [approverIds, setApproverIds] = useState<number[]>([]);
  const [approverToAdd, setApproverToAdd] = useState('');

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
        setSalePrice(String(s.salePrice));
        setLaborCost(String(s.laborCost));
        setOverheadCost(String(s.overheadCost));
        setRemark(s.remark ?? '');
        setItems(s.items.map((i) => ({
          key: ++rowSeq,
          materialId: String(i.materialId),
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
          lossRate: String(i.lossRate),
        })));
        setApproverIds(s.steps.map((st) => st.approverId));
      }
    };
    load().then(() => setLoaded(true)).catch((e) => { setError(errMsg(e)); setLoaded(true); });
  }, [editId]);

  const materialById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const approverById = useMemo(() => new Map(approvers.map((u) => [u.id, u])), [approvers]);

  const preview = useMemo(() => {
    const lines = items
      .filter((r) => r.materialId)
      .map((r) => ({
        type: materialById.get(Number(r.materialId))?.type ?? 'RAW',
        quantity: num(r.quantity),
        unitPrice: num(r.unitPrice),
        lossRate: num(r.lossRate),
      }));
    return calcCost(lines, num(laborCost), num(overheadCost), num(productionQty), num(salePrice));
  }, [items, laborCost, overheadCost, productionQty, salePrice, materialById]);

  const updateItem = (key: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const selectMaterial = (key: number, materialId: string) => {
    const m = materialById.get(Number(materialId));
    updateItem(key, { materialId, unitPrice: m ? String(m.unitPrice) : '' });
  };

  const selectProduct = (value: string) => {
    setProductId(value);
    const prod = products.find((x) => x.id === Number(value));
    if (prod) {
      setSalePrice(String(prod.salePrice));
      if (!title.trim()) setTitle(`${prod.name} 제조원가`);
    }
  };

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
    salePrice: num(salePrice),
    laborCost: num(laborCost),
    overheadCost: num(overheadCost),
    remark: remark.trim() || null,
    items: items
      .filter((r) => r.materialId)
      .map((r) => ({
        materialId: Number(r.materialId),
        quantity: num(r.quantity),
        unitPrice: r.unitPrice.trim() === '' ? null : num(r.unitPrice),
        lossRate: num(r.lossRate),
      })),
    approverIds,
  });

  const save = async (submitAfter: boolean) => {
    if (submitAfter && !window.confirm('저장 후 바로 결재를 상신할까요? 상신 후에는 수정할 수 없습니다.')) return;
    setBusy(true);
    setError(null);
    try {
      const body = buildRequest();
      const saved = editId ? await api.updateCostSheet(editId, body) : await api.createCostSheet(body);
      // 저장은 됐으므로 상신이 실패해도 상세 화면으로 이동해 오류를 보여준다 (중복 생성 방지)
      let submitError: string | null = null;
      if (submitAfter) {
        await api.submit(saved.id).catch((e) => { submitError = `저장은 되었지만 상신하지 못했습니다: ${errMsg(e)}`; });
      }
      navigate(`/cost-sheets/${saved.id}`, { replace: true, state: { error: submitError } });
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

  const rawMaterials = materials.filter((m) => m.type === 'RAW' && m.active);
  const packMaterials = materials.filter((m) => m.type === 'PACKAGING' && m.active);
  const selectableApprovers = approvers.filter((u) => !approverIds.includes(u.id));

  return (
    <form onSubmit={onSubmit}>
      <h1 className="h4 mb-3">{editId ? '원가계산서 수정' : '새 원가계산서'}</h1>
      <ErrorAlert message={error} />

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">기본 정보</div>
        <div className="card-body row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="product">제품 *</label>
            <select id="product" className="form-select" value={productId} onChange={(e) => selectProduct(e.target.value)} required>
              <option value="">선택하세요</option>
              {products.filter((p) => p.active || String(p.id) === productId).map((p) => (
                <option key={p.id} value={p.id}>{p.code} · {p.name} {p.spec ? `(${p.spec})` : ''}</option>
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
          <div className="col-12">
            <label className="form-label" htmlFor="remark">비고 (변경 사유 등)</label>
            <textarea id="remark" className="form-control" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={2000} />
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <span className="fw-semibold">배합표 (원재료·포장재)</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setItems((r) => [...r, newRow()])}>
            <i className="bi bi-plus-lg me-1" />행 추가
          </button>
        </div>
        <div className="card-body p-2 p-md-3">
          <div className="d-none d-md-grid item-grid item-grid-head small text-muted px-1 mb-1">
            <span>자재</span><span className="text-end">투입량</span><span className="text-end">단가(원)</span>
            <span className="text-end">손실률(%)</span><span className="text-end">금액(원)</span><span />
          </div>
          <div className="vstack gap-2">
            {items.map((r) => {
              const m = materialById.get(Number(r.materialId));
              return (
                <div key={r.key} className="item-grid item-row">
                  <select className="form-select form-select-sm" aria-label="자재" value={r.materialId}
                    onChange={(e) => selectMaterial(r.key, e.target.value)}>
                    <option value="">자재 선택</option>
                    <optgroup label="원재료">
                      {rawMaterials.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}
                    </optgroup>
                    <optgroup label="포장재">
                      {packMaterials.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}
                    </optgroup>
                  </select>
                  <div className="input-group input-group-sm">
                    <input type="number" step="any" min={0} className="form-control text-end" aria-label="투입량"
                      placeholder="투입량" value={r.quantity} onChange={(e) => updateItem(r.key, { quantity: e.target.value })} />
                    <span className="input-group-text unit-label">{m?.unit ?? '단위'}</span>
                  </div>
                  <input type="number" step="any" min={0} className="form-control form-control-sm text-end" aria-label="단가"
                    placeholder="단가" value={r.unitPrice} onChange={(e) => updateItem(r.key, { unitPrice: e.target.value })} />
                  <input type="number" step="any" min={0} max={100} className="form-control form-control-sm text-end" aria-label="손실률"
                    placeholder="손실률" value={r.lossRate} onChange={(e) => updateItem(r.key, { lossRate: e.target.value })} />
                  <div className="text-end fw-medium small item-amount">
                    {fmtWon(lineAmount({ quantity: num(r.quantity), unitPrice: num(r.unitPrice), lossRate: num(r.lossRate) }))}
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-danger" aria-label="행 삭제"
                    onClick={() => setItems((rows) => rows.filter((x) => x.key !== r.key))}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="form-text mt-2">금액 = 투입량 × 단가 × (1 + 손실률/100). 단가는 자재 기준단가가 자동으로 들어가며 수정할 수 있습니다.</div>
        </div>
      </div>

      <h2 className="h6 text-muted mb-2">원가 미리보기</h2>
      <CostSummaryCards
        materialCost={preview.materialCost}
        packagingCost={preview.packagingCost}
        laborCost={num(laborCost)}
        overheadCost={num(overheadCost)}
        totalCost={preview.totalCost}
        unitCost={preview.unitCost}
        salePrice={num(salePrice)}
        marginRate={preview.marginRate}
        productionQty={num(productionQty)}
      />

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">결재선</div>
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

      <div className="d-flex flex-wrap gap-2 justify-content-end mb-5">
        <button type="button" className="btn btn-light" onClick={() => navigate(-1)} disabled={busy}>취소</button>
        <button type="submit" className="btn btn-outline-primary" disabled={busy}>
          <i className="bi bi-save me-1" />임시저장
        </button>
        <button type="button" className="btn btn-brand" disabled={busy} onClick={() => save(true)}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}
          <i className="bi bi-send me-1" />저장 후 상신
        </button>
      </div>
    </form>
  );
}
