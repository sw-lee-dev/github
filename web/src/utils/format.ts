const won = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 4 });

/** 1234567 → "1,234,567" */
export const fmtWon = (v: number | null | undefined) => (v == null ? '-' : won.format(v));

/** 개당원가 등 소수 둘째자리까지 */
export const fmtWon2 = (v: number | null | undefined) =>
  v == null ? '-' : new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(v);

export const fmtNum = (v: number | null | undefined) => (v == null ? '-' : decimal.format(v));

export const fmtPct = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(2)}%`);

export const fmtDateTime = (v: string | null | undefined) => {
  if (!v) return '-';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const fmtDate = (v: string | null | undefined) => (v ? fmtDateTime(v).slice(0, 10) : '-');
