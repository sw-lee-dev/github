package com.foodcost.cost;

import com.foodcost.master.ProductApprovalStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
class CostSheetProductApprovalStatus implements ProductApprovalStatus {

    private final CostSheetRepository costSheetRepository;

    @Override
    public Set<Long> productIdsInApproval() {
        return new HashSet<>(costSheetRepository.findProductIdsByStatus(CostStatus.IN_APPROVAL));
    }
}
