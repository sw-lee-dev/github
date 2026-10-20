package com.foodcost.master;

import com.foodcost.common.ApiException;

import java.util.Collection;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 기준정보 코드 채번. 형식: {접두어}-{4자리 순번} (예: M-0001, P-0012, FG-0003)
 * <p>
 * 같은 접두어의 기존 코드 중 가장 큰 순번 + 1 을 부여하고, 기존 코드가 없으면 1 번부터 시작한다.
 */
public final class CodeSequence {

    public static final int DIGITS = 4;
    public static final int MAX_SEQ = 9999;

    private CodeSequence() {
    }

    /** 기존 코드 목록에서 접두어별 가장 큰 순번. 없으면 0 */
    public static int maxSeq(String prefix, Collection<String> existingCodes) {
        Pattern pattern = Pattern.compile("^" + Pattern.quote(prefix) + "-(\\d+)$");
        int max = 0;
        for (String code : existingCodes) {
            Matcher m = pattern.matcher(code);
            if (m.matches()) {
                max = Math.max(max, Integer.parseInt(m.group(1)));
            }
        }
        return max;
    }

    public static String format(String prefix, int seq) {
        if (seq > MAX_SEQ) {
            throw ApiException.conflict(prefix + " 코드가 최대 순번(" + MAX_SEQ + ")을 넘었습니다.");
        }
        return prefix + "-" + String.format("%0" + DIGITS + "d", seq);
    }

    public static String next(String prefix, Collection<String> existingCodes) {
        return format(prefix, maxSeq(prefix, existingCodes) + 1);
    }
}
