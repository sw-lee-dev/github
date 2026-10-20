package com.foodcost.approval;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StepStatus {
    WAITING("대기"),
    PENDING("결재할 차례"),
    APPROVED("승인"),
    REJECTED("반려");

    private final String label;
}
