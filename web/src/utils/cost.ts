/**
 * 화면 미리보기용 원가 계산. 서버(CostSheet, CostSheetItem)와 같은 공식이며, 저장 시 서버 값이 기준이다.
 *
 * 총 생산량(kg) = 제품 당 무게(g) × 생산수량 ÷ 1000
 * 총 투입량(kg) = 총 생산량 ÷ (1 − 원재료 손실률%)
 * 원자재  투입량 = 총 생산량 × 배합비%            (자재 단위가 g 이면 × 1000)
 *         금액   = 투입량 × 단가,  원자재 합계 = Σ 금액
 * 원재료비       = 원자재 합계 ÷ (1 − 원재료 손실률%)
 * 포장자재 금액  = 투입량 × 단가 × (1 + 손실률%)  (투입량은 배치 생산량 기준)
 * 원자재 투입량 합계(kg) = Σ 투입량 × 1 단위당 kg   (kg 1, g 0.001, 그 외 단위는 자재 비중)
 * 총원가         = 원재료비 + 포장재비 + 노무비 + 제조경비  (노무비·제조경비가 0원이면 상신 불가)
 */
const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

export const totalOutputKg = (unitWeightG: number, productionQty: number) =>
  round(((unitWeightG || 0) * (productionQty || 0)) / 1000, 3);

/** 1 − 원재료 손실률%. 손실률이 100% 이상이면 0 */
const rawYield = (rawLossRate: number) => Math.max(0, 1 - (rawLossRate || 0) / 100);

export const totalInputKg = (totalKg: number, rawLossRate: number) => {
  const y = rawYield(rawLossRate);
  return y > 0 ? round(totalKg / y, 3) : 0;
};

export function rawQuantity(totalKg: number, ratio: number, unit: string) {
  const kg = ((totalKg || 0) * (ratio || 0)) / 100;
  return round(unit.toLowerCase() === 'g' ? kg * 1000 : kg, 4);
}

const unitKey = (unit: string) => unit.trim().toLowerCase();

/** 비중 입력 대상: kg·g 이 아닌 단위의 원재료 (서버 Material.requiresGravity 와 동일) */
export const requiresGravity = (type: string, unit: string) =>
  type === 'RAW' && unitKey(unit) !== 'kg' && unitKey(unit) !== 'g';

/** 1 단위당 kg. kg → 1, g → 0.001, 그 외 → 비중 (없으면 null) */
export function kgPerUnit(unit: string, specificGravity: number | null | undefined) {
  if (unitKey(unit) === 'kg') return 1;
  if (unitKey(unit) === 'g') return 0.001;
  return specificGravity ?? null;
}

/** 금액은 원 단위 소수 둘째자리로 반올림 (서버 CostSheetItem 과 동일) */
export const rawAmount = (quantity: number, unitPrice: number) => round(quantity * (unitPrice || 0), 2);

/** 원재료비 = 원자재 합계 ÷ (1 − 원재료 손실률%) */
export const rawMaterialCost = (rawSubtotal: number, rawLossRate: number) => {
  const y = rawYield(rawLossRate);
  return y > 0 ? round(rawSubtotal / y, 2) : 0;
};

export const packagingAmount = (quantity: number, unitPrice: number, lossRate: number) =>
  round((quantity || 0) * (unitPrice || 0) * (1 + (lossRate || 0) / 100), 2);

export function calcCost(materialCost: number, packagingCost: number, laborCost: number, overheadCost: number,
  productionQty: number, salePrice: number) {
  const totalCost = round(materialCost + packagingCost + (laborCost || 0) + (overheadCost || 0), 2);
  const unitCost = productionQty > 0 ? round(totalCost / productionQty, 2) : 0;
  const marginRate = salePrice > 0 ? round(((salePrice - unitCost) / salePrice) * 100, 2) : null;
  return { totalCost, unitCost, marginRate };
}
