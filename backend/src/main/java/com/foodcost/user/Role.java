package com.foodcost.user;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Role {
    WRITER("원가담당"),
    APPROVER("결재권자"),
    ADMIN("관리자");

    private final String label;
}
