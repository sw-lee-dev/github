import type { MaterialType } from '../api/types';

/**
 * 화면 미리보기용 원가 계산. 서버(CostSheet.recalculate)와 같은 공식이며, 저장 시 서버 값이 기준이다.
 */
export interface CostLine {
  type: MaterialType;
  quantity: number;
  unitPrice: number;
  lossRate: number;
}

export const lineAmount = (l: Pick<CostLine, 'quantity' | 'unitPrice' | 'lossRate'>) =>
  Math.round((l.quantity || 0) * (l.unitPrice || 0) * (1 + (l.lossRate || 0) / 100));

export function calcCost(lines: CostLine[], laborCost: number, overheadCost: number, productionQty: number, salePrice: number) {
  const sum = (type: MaterialType) => lines.filter((l) => l.type === type).reduce((acc, l) => acc + lineAmount(l), 0);
  const materialCost = sum('RAW');
  const packagingCost = sum('PACKAGING');
  const totalCost = materialCost + packagingCost + (laborCost || 0) + (overheadCost || 0);
  const unitCost = productionQty > 0 ? Math.round((totalCost / productionQty) * 100) / 100 : 0;
  const marginRate = salePrice > 0 ? Math.round(((salePrice - unitCost) / salePrice) * 10000) / 100 : null;
  return { materialCost, packagingCost, totalCost, unitCost, marginRate };
}
