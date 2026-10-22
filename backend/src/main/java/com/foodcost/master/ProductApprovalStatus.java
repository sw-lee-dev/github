package com.foodcost.master;

import java.util.Set;

/**
 * 제품 수정 잠금 판단에 필요한 결재 상태. 원가계산서는 원가 모듈에 있으므로 그쪽에서 구현한다
 * (기준정보 모듈이 원가 모듈을 직접 참조하지 않도록).
 */
public interface ProductApprovalStatus {

    /** 결재중(상신 후 승인·반려 전)인 원가계산서가 있는 제품 id */
    Set<Long> productIdsInApproval();
}
