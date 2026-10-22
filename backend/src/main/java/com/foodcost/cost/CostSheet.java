package com.foodcost.cost;

import com.foodcost.approval.ApprovalAction;
import com.foodcost.approval.ApprovalHistory;
import com.foodcost.approval.ApprovalStep;
import com.foodcost.approval.StepStatus;
import com.foodcost.common.ApiException;
import com.foodcost.common.BaseTimeEntity;
import com.foodcost.master.Material;
import com.foodcost.master.MaterialType;
import com.foodcost.master.Product;
import com.foodcost.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

/**
 * 제조원가계산서 (결재 문서).
 * <pre>
 * 총 생산량   = 제품 당 무게(g) × 생산수량 ÷ 1000 (kg)
 * 총 투입량   = 총 생산량 ÷ (1 − 원재료 손실률%)
 * 원자재 합계 = Σ(총 생산량 × 배합비% × 단가)
 * 원재료비    = 원자재 합계 ÷ (1 − 원재료 손실률%)
 * 총원가     = 원재료비 + 포장재비 + 노무비 + 제조경비
 * 개당원가 = 총원가 ÷ 생산수량
 * 마진율   = (판매가 - 개당원가) ÷ 판매가 × 100
 * </pre>
 */
@Entity
@Table(name = "cost_sheet")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CostSheet extends BaseTimeEntity {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 문서번호 (예: CS-20261020-001) */
    @Column(nullable = false, unique = true, length = 30)
    private String docNo;

    @Column(nullable = false, length = 200)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    /** 생산 1회(배치)당 생산수량(개) */
    @Column(nullable = false)
    private int productionQty;

    /** 제품 1개당 무게(g) - 작성 시점 제품 값 스냅샷 */
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal unitWeight;

    /** 총 생산량(kg) = 제품 당 무게(g) × 생산수량 ÷ 1000 */
    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal totalOutput;

    /** 승인 판매가(원, 개당) - 최종 결재자가 승인할 때 확정. 승인완료 전에는 null */
    @Column(precision = 15, scale = 2)
    private BigDecimal approvedSalePrice;

    /** 원재료 손실률(%) - 0 이상 100 미만 */
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal rawLossRate = BigDecimal.ZERO;

    /** 총 투입량(kg) = 총 생산량 ÷ (1 − 원재료 손실률%) */
    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal totalInput = BigDecimal.ZERO;

    /** 개당 판매가(원) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal salePrice;

    /** 배치당 노무비(원) */
    @Column(nullable = false, precision = 18, scale = 0)
    private BigDecimal laborCost;

    /** 배치당 제조경비(전력·가스·감가상각 등, 원) */
    @Column(nullable = false, precision = 18, scale = 0)
    private BigDecimal overheadCost;

    @Column(length = 2000)
    private String remark;

    /** 원자재 투입량 합계(kg) = Σ 원자재 투입량 × 1 단위당 kg (kg 이 아닌 자재는 비중으로 환산) */
    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal rawInputKg = BigDecimal.ZERO;

    /** 원자재 합계(손실 반영 전) = Σ 원자재 품목 금액 */
    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal rawSubtotal = BigDecimal.ZERO;

    /** 원재료비 = 원자재 합계 ÷ (1 − 원재료 손실률%) */
    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal materialCost = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal packagingCost = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal totalCost = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitCost = BigDecimal.ZERO;

    /** 판매가가 0이면 null */
    @Column(precision = 7, scale = 2)
    private BigDecimal marginRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CostStatus status = CostStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "writer_id")
    private User writer;

    private LocalDateTime submittedAt;

    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "costSheet", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNo ASC")
    private List<CostSheetItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "costSheet", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seq ASC")
    private List<ApprovalStep> steps = new ArrayList<>();

    @OneToMany(mappedBy = "costSheet", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<ApprovalHistory> histories = new ArrayList<>();

    public CostSheet(String docNo, User writer) {
        this.docNo = docNo;
        this.writer = writer;
    }

    /**
     * 품목 입력값. unitPrice 는 이미 자재 기준단가로 보정된 값이어야 한다.
     * 원자재는 ratio(배합비%), 포장자재는 quantity(투입량)를 사용한다.
     */
    public record ItemLine(Material material, BigDecimal ratio, BigDecimal quantity, BigDecimal unitPrice,
                           BigDecimal lossRate) {
    }

    // ---------------------------------------------------------------- 작성/수정

    public void updateContent(String title, Product product, int productionQty, BigDecimal rawLossRate,
                              BigDecimal salePrice, BigDecimal laborCost, BigDecimal overheadCost, String remark) {
        ensureEditable();
        if (rawLossRate.compareTo(HUNDRED) >= 0) {
            throw ApiException.badRequest("원재료 손실률은 100% 미만이어야 합니다.");
        }
        this.title = title;
        this.product = product;
        this.productionQty = productionQty;
        this.unitWeight = product.getUnitWeight();
        this.totalOutput = unitWeight.multiply(BigDecimal.valueOf(productionQty))
                .divide(BigDecimal.valueOf(1000), 3, RoundingMode.HALF_UP);
        this.rawLossRate = rawLossRate;
        this.totalInput = totalOutput.divide(rawYield(), 3, RoundingMode.HALF_UP);
        this.salePrice = salePrice;
        this.laborCost = laborCost;
        this.overheadCost = overheadCost;
        this.remark = remark;
    }

    public void replaceItems(List<ItemLine> lines) {
        ensureEditable();
        items.clear();
        int lineNo = 1;
        for (ItemLine line : lines) {
            items.add(line.material().getType() == MaterialType.RAW
                    ? CostSheetItem.raw(this, lineNo++, line.material(), line.ratio(), line.unitPrice(), totalOutput)
                    : CostSheetItem.packaging(this, lineNo++, line.material(), line.quantity(), line.unitPrice(),
                    line.lossRate()));
        }
        recalculate();
    }

    public void replaceApprovers(List<User> approvers) {
        ensureEditable();
        if (new HashSet<>(approvers.stream().map(User::getId).toList()).size() != approvers.size()) {
            throw ApiException.badRequest("결재선에 같은 사람을 두 번 지정할 수 없습니다.");
        }
        for (User approver : approvers) {
            if (approver.getId().equals(writer.getId())) {
                throw ApiException.badRequest("작성자 본인은 결재선에 넣을 수 없습니다.");
            }
            if (!approver.canApprove()) {
                throw ApiException.badRequest(approver.getDisplayName() + "님은 결재 권한이 없습니다.");
            }
        }
        steps.clear();
        int seq = 1;
        for (User approver : approvers) {
            steps.add(new ApprovalStep(this, seq++, approver));
        }
    }

    public void recalculate() {
        rawSubtotal = sumAmount(MaterialType.RAW);
        rawInputKg = items.stream()
                .filter(i -> i.getMaterialType() == MaterialType.RAW)
                .map(CostSheetItem::getQuantityKg)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        materialCost = rawSubtotal.divide(rawYield(), 2, RoundingMode.HALF_UP);
        packagingCost = sumAmount(MaterialType.PACKAGING);
        totalCost = materialCost.add(packagingCost).add(laborCost).add(overheadCost);
        unitCost = productionQty > 0
                ? totalCost.divide(BigDecimal.valueOf(productionQty), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        marginRate = salePrice.signum() > 0
                ? salePrice.subtract(unitCost).multiply(HUNDRED).divide(salePrice, 2, RoundingMode.HALF_UP)
                : null;
    }

    /** 1 − 원재료 손실률% */
    private BigDecimal rawYield() {
        return BigDecimal.ONE.subtract(rawLossRate.divide(HUNDRED, 6, RoundingMode.HALF_UP));
    }

    private BigDecimal sumAmount(MaterialType type) {
        return items.stream()
                .filter(i -> i.getMaterialType() == type)
                .map(CostSheetItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ---------------------------------------------------------------- 결재

    public void submit(User actor) {
        ensureWriter(actor);
        ensureEditable();
        if (items.isEmpty()) {
            throw ApiException.badRequest("원재료/포장재 품목을 1개 이상 입력하세요.");
        }
        // 노무비·제조경비는 총원가에 반드시 들어가야 하므로 0원(기본값) 그대로는 상신할 수 없다
        if (laborCost.signum() <= 0) {
            throw ApiException.badRequest("노무비를 입력하세요. (0원으로는 상신할 수 없습니다)");
        }
        if (overheadCost.signum() <= 0) {
            throw ApiException.badRequest("제조경비를 입력하세요. (0원으로는 상신할 수 없습니다)");
        }
        if (steps.isEmpty()) {
            throw ApiException.badRequest("결재선을 지정하세요.");
        }
        steps.forEach(ApprovalStep::reset);
        steps.get(0).activate();
        status = CostStatus.IN_APPROVAL;
        submittedAt = LocalDateTime.now();
        completedAt = null;
        approvedSalePrice = null;
        histories.add(new ApprovalHistory(this, actor, ApprovalAction.SUBMITTED, null));
    }

    /**
     * 승인. 마지막 결재자의 승인이면 문서가 승인완료되고, 승인 판매가를 확정해 제품 기준 판매가에 반영한다.
     *
     * @param salePrice 최종 결재자가 입력한 승인 판매가. 비우면 작성자가 입력한 개당 판매가. 중간 결재자는 무시
     */
    public void approve(User actor, String comment, BigDecimal salePrice) {
        ApprovalStep step = currentStepOf(actor);
        step.approve(comment);
        histories.add(new ApprovalHistory(this, actor, ApprovalAction.APPROVED, comment));

        Optional<ApprovalStep> next = steps.stream()
                .filter(s -> s.getSeq() > step.getSeq())
                .findFirst();
        if (next.isPresent()) {
            next.get().activate();
        } else {
            status = CostStatus.APPROVED;
            completedAt = LocalDateTime.now();
            approvedSalePrice = salePrice != null ? salePrice : this.salePrice;
            product.changeSalePrice(approvedSalePrice);
        }
    }

    /** 지금 결재 차례가 이 사용자이고, 그 단계가 마지막 단계인지 (승인 판매가 입력 대상) */
    public boolean isFinalPendingApprover(Long userId) {
        return isPendingApprover(userId)
                && currentStep().map(s -> s.getSeq() == steps.get(steps.size() - 1).getSeq()).orElse(false);
    }

    public void reject(User actor, String comment) {
        if (comment == null || comment.isBlank()) {
            throw ApiException.badRequest("반려 사유를 입력하세요.");
        }
        ApprovalStep step = currentStepOf(actor);
        step.reject(comment);
        histories.add(new ApprovalHistory(this, actor, ApprovalAction.REJECTED, comment));
        status = CostStatus.REJECTED;
        completedAt = LocalDateTime.now();
    }

    /** 아직 아무도 승인하지 않은 문서를 작성자가 회수한다. */
    public void withdraw(User actor) {
        ensureWriter(actor);
        if (status != CostStatus.IN_APPROVAL) {
            throw ApiException.badRequest("결재중인 문서만 회수할 수 있습니다.");
        }
        if (steps.stream().anyMatch(s -> s.getStatus() == StepStatus.APPROVED)) {
            throw ApiException.badRequest("이미 승인한 결재자가 있어 회수할 수 없습니다.");
        }
        steps.forEach(ApprovalStep::reset);
        status = CostStatus.DRAFT;
        submittedAt = null;
        histories.add(new ApprovalHistory(this, actor, ApprovalAction.WITHDRAWN, null));
    }

    public Optional<ApprovalStep> currentStep() {
        if (status != CostStatus.IN_APPROVAL) {
            return Optional.empty();
        }
        return steps.stream().filter(s -> s.getStatus() == StepStatus.PENDING).findFirst();
    }

    // ---------------------------------------------------------------- 권한 체크 helpers

    public boolean isWriter(Long userId) {
        return writer.getId().equals(userId);
    }

    public boolean isPendingApprover(Long userId) {
        return currentStep().map(s -> s.isApprover(userId)).orElse(false);
    }

    public boolean isWithdrawable(Long userId) {
        return isWriter(userId) && status == CostStatus.IN_APPROVAL
                && steps.stream().noneMatch(s -> s.getStatus() == StepStatus.APPROVED);
    }

    private ApprovalStep currentStepOf(User actor) {
        if (status != CostStatus.IN_APPROVAL) {
            throw ApiException.badRequest("결재중인 문서가 아닙니다. (현재 상태: " + status.getLabel() + ")");
        }
        ApprovalStep step = currentStep()
                .orElseThrow(() -> ApiException.conflict("결재할 단계가 없습니다."));
        if (!step.isApprover(actor.getId())) {
            throw ApiException.forbidden("지금은 " + step.getApprover().getDisplayName() + "님의 결재 차례입니다.");
        }
        return step;
    }

    private void ensureEditable() {
        if (!status.isEditable()) {
            throw ApiException.badRequest(status.getLabel() + " 상태의 문서는 수정할 수 없습니다.");
        }
    }

    private void ensureWriter(User actor) {
        if (!isWriter(actor.getId())) {
            throw ApiException.forbidden("작성자만 처리할 수 있습니다.");
        }
    }
}
