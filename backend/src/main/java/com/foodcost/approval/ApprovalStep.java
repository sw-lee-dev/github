package com.foodcost.approval;

import com.foodcost.cost.CostSheet;
import com.foodcost.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 결재선의 한 단계. seq 순서대로 한 명씩 결재한다.
 */
@Entity
@Table(name = "approval_step")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cost_sheet_id")
    private CostSheet costSheet;

    @Column(nullable = false)
    private int seq;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "approver_id")
    private User approver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StepStatus status = StepStatus.WAITING;

    @Column(length = 1000)
    private String comment;

    private LocalDateTime actedAt;

    public ApprovalStep(CostSheet costSheet, int seq, User approver) {
        this.costSheet = costSheet;
        this.seq = seq;
        this.approver = approver;
    }

    public boolean isApprover(Long userId) {
        return approver.getId().equals(userId);
    }

    public void reset() {
        status = StepStatus.WAITING;
        comment = null;
        actedAt = null;
    }

    public void activate() {
        status = StepStatus.PENDING;
    }

    public void approve(String comment) {
        complete(StepStatus.APPROVED, comment);
    }

    public void reject(String comment) {
        complete(StepStatus.REJECTED, comment);
    }

    private void complete(StepStatus result, String comment) {
        this.status = result;
        this.comment = comment;
        this.actedAt = LocalDateTime.now();
    }
}
