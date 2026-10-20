package com.foodcost.cost;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CostStatus {
    DRAFT("임시저장"),
    IN_APPROVAL("결재중"),
    APPROVED("승인완료"),
    REJECTED("반려");

    private final String label;

    /** 작성자가 내용을 수정할 수 있는 상태 */
    public boolean isEditable() {
        return this == DRAFT || this == REJECTED;
    }
}
