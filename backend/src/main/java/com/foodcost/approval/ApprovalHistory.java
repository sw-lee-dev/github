package com.foodcost.approval;

import com.foodcost.cost.CostSheet;
import com.foodcost.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 결재 이력. 반려 후 재상신하면 결재선은 초기화되지만 이력은 계속 쌓인다.
 */
@Entity
@Table(name = "approval_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cost_sheet_id")
    private CostSheet costSheet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApprovalAction action;

    @Column(length = 1000)
    private String comment;

    @Column(nullable = false)
    private LocalDateTime actedAt;

    public ApprovalHistory(CostSheet costSheet, User actor, ApprovalAction action, String comment) {
        this.costSheet = costSheet;
        this.actor = actor;
        this.action = action;
        this.comment = comment;
        this.actedAt = LocalDateTime.now();
    }
}
