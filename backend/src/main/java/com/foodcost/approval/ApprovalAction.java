package com.foodcost.approval;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ApprovalAction {
    SUBMITTED("상신"),
    APPROVED("승인"),
    REJECTED("반려"),
    WITHDRAWN("회수");

    private final String label;
}
