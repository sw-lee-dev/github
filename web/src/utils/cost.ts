/**
 * 화면 미리보기용 원가 계산. 서버(CostSheet, CostSheetItem)와 같은 공식이며, 저장 시 서버 값이 기준이다.
 *
 * 총 생산량(kg) = 제품 당 무게(g) × 생산수량 ÷ 1000
 * 원자재  투입량 = 총 생산량 × 배합비% × (1 − 손실률%)   (자재 단위가 g 이면 × 1000)
 *         금액   = 투입량 × 단가
 * 포장자재 금액  = 투입량 × 단가 × (1 + 손실률%)
 */
const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

export const totalOutputKg = (unitWeightG: number, productionQty: number) =>
  round(((unitWeightG || 0) * (productionQty || 0)) / 1000, 3);

export function rawQuantity(totalKg: number, ratio: number, lossRate: number, unit: string) {
  const kg = (((totalKg || 0) * (ratio || 0)) / 100) * (1 - (lossRate || 0) / 100);
  return round(unit.toLowerCase() === 'g' ? kg * 1000 : kg, 4);
}

export const rawAmount = (quantity: number, unitPrice: number) => Math.round(quantity * (unitPrice || 0));

export const packagingAmount = (quantity: number, unitPrice: number, lossRate: number) =>
  Math.round((quantity || 0) * (unitPrice || 0) * (1 + (lossRate || 0) / 100));

export function calcCost(materialCost: number, packagingCost: number, laborCost: number, overheadCost: number,
  productionQty: number, salePrice: number) {
  const totalCost = materialCost + packagingCost + (laborCost || 0) + (overheadCost || 0);
  const unitCost = productionQty > 0 ? round(totalCost / productionQty, 2) : 0;
  const marginRate = salePrice > 0 ? round(((salePrice - unitCost) / salePrice) * 100, 2) : null;
  return { totalCost, unitCost, marginRate };
}
