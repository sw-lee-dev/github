package com.foodcost.master;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MaterialType {
    RAW("원재료", "M"),
    PACKAGING("포장재", "P");

    private final String label;

    /** 자재코드 접두어 (M-0001, P-0001) */
    private final String codePrefix;
}
