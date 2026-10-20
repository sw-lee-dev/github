package com.foodcost.master;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MaterialType {
    RAW("원재료"),
    PACKAGING("포장재");

    private final String label;
}
