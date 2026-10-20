package com.foodcost.approval;

import com.foodcost.cost.CostSheetDto.InboxCount;
import com.foodcost.cost.CostSheetDto.Summary;
import com.foodcost.cost.CostSheetService;
import com.foodcost.user.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 결재함. 승인/반려 처리 자체는 /api/cost-sheets/{id}/approve|reject 에서 한다.
 */
@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final CostSheetService costSheetService;

    /** box=pending(내 차례) | done(내가 처리한 문서) */
    @GetMapping
    public List<Summary> inbox(@AuthenticationPrincipal AuthUser user,
                               @RequestParam(defaultValue = "pending") String box) {
        return "done".equals(box)
                ? costSheetService.processedApprovals(user)
                : costSheetService.pendingApprovals(user);
    }

    @GetMapping("/count")
    public InboxCount count(@AuthenticationPrincipal AuthUser user) {
        return costSheetService.inboxCount(user);
    }
}
