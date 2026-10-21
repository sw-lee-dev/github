/*
 * 숫자 표시 규칙
 *  - 원 단위(단가·금액·원가)       : 소수 둘째자리 고정   fmtWon    1,350.00
 *  - 무게(원자재 투입량·총 투입량)   : 소수 셋째자리 고정   fmtWeight 244.898
 *  - 판매가·노무비·제조경비·총 생산량·제품 당 무게·개수 : 정수  fmtInt    4,500
 *  - 그 밖의 수(배합비·손실률·EA 수량)   : 있는 그대로     fmtNum
 */
const fixed = (digits: number) =>
  new Intl.NumberFormat('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const won = fixed(2);
const weight = fixed(3);
const int = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 4 });

/** 원 단위: 1350 → "1,350.00" */
export const fmtWon = (v: number | null | undefined) => (v == null ? '-' : won.format(v));

/** 무게: 244.89796 → "244.898" */
export const fmtWeight = (v: number | null | undefined) => (v == null ? '-' : weight.format(v));

/** 정수: 4500 → "4,500" */
export const fmtInt = (v: number | null | undefined) => (v == null ? '-' : int.format(v));

export const fmtNum = (v: number | null | undefined) => (v == null ? '-' : decimal.format(v));

export const fmtPct = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(2)}%`);

export const fmtDateTime = (v: string | null | undefined) => {
  if (!v) return '-';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const fmtDate = (v: string | null | undefined) => (v ? fmtDateTime(v).slice(0, 10) : '-');
