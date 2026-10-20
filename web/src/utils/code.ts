import type { MaterialType } from '../api/types';

/**
 * 코드 채번 미리보기. 실제 코드는 저장 시 서버(CodeSequence)가 같은 규칙으로 부여한다.
 * 형식: {접두어}-{4자리 순번}, 기존 최대 순번 + 1 (없으면 0001)
 */
export const CODE_DIGITS = 4;
export const PRODUCT_CODE_PREFIX = 'FG';
export const MATERIAL_CODE_PREFIX: Record<MaterialType, string> = { RAW: 'M', PACKAGING: 'P' };

export function maxSeq(prefix: string, codes: string[]): number {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  return codes.reduce((max, code) => {
    const m = re.exec(code);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
}

export const formatCode = (prefix: string, seq: number) => `${prefix}-${String(seq).padStart(CODE_DIGITS, '0')}`;

export const nextCode = (prefix: string, codes: string[]) => formatCode(prefix, maxSeq(prefix, codes) + 1);
