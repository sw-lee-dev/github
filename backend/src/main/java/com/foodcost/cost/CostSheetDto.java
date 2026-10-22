package com.foodcost.cost;

import com.foodcost.approval.ApprovalAction;
import com.foodcost.approval.ApprovalHistory;
import com.foodcost.approval.ApprovalStep;
import com.foodcost.approval.StepStatus;
import com.foodcost.master.MaterialType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class CostSheetDto {

    private CostSheetDto() {
    }

    // ---------------------------------------------------------------- request

    public record SaveRequest(
            @NotBlank(message = "제목을 입력하세요.") @Size(max = 200, message = "제목은 200자 이내로 입력하세요.") String title,
            @NotNull(message = "제품을 선택하세요.") Long productId,
            @NotNull(message = "생산수량을 입력하세요.") @Min(value = 1, message = "생산수량은 1 이상이어야 합니다.") Integer productionQty,
            @NotNull(message = "원재료 손실률을 입력하세요.") @DecimalMin(value = "0", message = "원재료 손실률은 0 이상이어야 합니다.")
            @DecimalMax(value = "100", inclusive = false, message = "원재료 손실률은 100% 미만이어야 합니다.") BigDecimal rawLossRate,
            @NotNull(message = "판매가를 입력하세요.") @DecimalMin(value = "0", message = "판매가는 0 이상이어야 합니다.") BigDecimal salePrice,
            @NotNull(message = "노무비를 입력하세요.") @DecimalMin(value = "0", message = "노무비는 0 이상이어야 합니다.") BigDecimal laborCost,
            @NotNull(message = "제조경비를 입력하세요.") @DecimalMin(value = "0", message = "제조경비는 0 이상이어야 합니다.") BigDecimal overheadCost,
            @Size(max = 2000) String remark,
            @NotNull @Valid List<ItemRequest> items,
            @NotNull List<Long> approverIds
    ) {
    }

    /**
     * 원자재는 ratio(배합비%)를, 포장자재는 quantity(투입량)와 lossRate 를 입력한다.
     * 원자재 투입량은 서버가 총 생산량 × 배합비로 계산하므로 quantity·lossRate 를 보내도 무시한다.
     */
    public record ItemRequest(
            @NotNull(message = "자재를 선택하세요.") Long materialId,
            @DecimalMin(value = "0", inclusive = false, message = "배합비는 0보다 커야 합니다.")
            @DecimalMax(value = "100", message = "배합비는 100% 이하여야 합니다.") BigDecimal ratio,
            @DecimalMin(value = "0", inclusive = false, message = "투입량은 0보다 커야 합니다.") BigDecimal quantity,
            /** 비우면 자재 기준단가 사용 */
            @DecimalMin(value = "0", message = "단가는 0 이상이어야 합니다.") BigDecimal unitPrice,
            @DecimalMin(value = "0", message = "손실률은 0 이상이어야 합니다.") @DecimalMax(value = "100", message = "손실률은 100 이하여야 합니다.") BigDecimal lossRate
    ) {
    }

    public record CommentRequest(@Size(max = 1000, message = "의견은 1000자 이내로 입력하세요.") String comment) {
    }

    /** 승인 요청. salePrice 는 최종 결재자만 사용(비우면 작성자가 입력한 개당 판매가) */
    public record ApproveRequest(
            @Size(max = 1000, message = "의견은 1000자 이내로 입력하세요.") String comment,
            @DecimalMin(value = "0", message = "승인 판매가는 0 이상이어야 합니다.") BigDecimal salePrice
    ) {
    }

    // ---------------------------------------------------------------- response

    public record Summary(
            Long id,
            String docNo,
            String title,
            String productName,
            String writerName,
            CostStatus status,
            String statusLabel,
            BigDecimal totalCost,
            BigDecimal unitCost,
            BigDecimal approvedSalePrice,
            BigDecimal salePrice,
            BigDecimal marginRate,
            String currentApproverName,
            LocalDateTime submittedAt,
            LocalDateTime updatedAt
    ) {
        public static Summary from(CostSheet s) {
            return new Summary(s.getId(), s.getDocNo(), s.getTitle(), s.getProduct().getName(),
                    s.getWriter().getDisplayName(), s.getStatus(), s.getStatus().getLabel(),
                    s.getTotalCost(), s.getUnitCost(), s.getApprovedSalePrice(), s.getSalePrice(), s.getMarginRate(),
                    s.currentStep().map(st -> st.getApprover().getDisplayName()).orElse(null),
                    s.getSubmittedAt(), s.getUpdatedAt());
        }
    }

    public record Detail(
            Long id,
            String docNo,
            String title,
            Long productId,
            String productCode,
            String productName,
            String productSpec,
            int productionQty,
            BigDecimal unitWeight,
            BigDecimal totalOutput,
            BigDecimal rawLossRate,
            BigDecimal totalInput,
            BigDecimal rawSubtotal,
            BigDecimal salePrice,
            BigDecimal materialCost,
            BigDecimal packagingCost,
            BigDecimal laborCost,
            BigDecimal overheadCost,
            BigDecimal totalCost,
            BigDecimal unitCost,
            BigDecimal approvedSalePrice,
            BigDecimal marginRate,
            String remark,
            CostStatus status,
            String statusLabel,
            Long writerId,
            String writerName,
            LocalDateTime createdAt,
            LocalDateTime submittedAt,
            LocalDateTime completedAt,
            List<Item> items,
            List<Step> steps,
            List<History> histories,
            Permissions permissions
    ) {
        public static Detail of(CostSheet s, Long viewerId) {
            return new Detail(s.getId(), s.getDocNo(), s.getTitle(),
                    s.getProduct().getId(), s.getProduct().getCode(), s.getProduct().getName(), s.getProduct().getSpec(),
                    s.getProductionQty(), s.getUnitWeight(), s.getTotalOutput(),
                    s.getRawLossRate(), s.getTotalInput(), s.getRawSubtotal(), s.getSalePrice(),
                    s.getMaterialCost(), s.getPackagingCost(), s.getLaborCost(), s.getOverheadCost(),
                    s.getTotalCost(), s.getUnitCost(), s.getApprovedSalePrice(), s.getMarginRate(), s.getRemark(),
                    s.getStatus(), s.getStatus().getLabel(),
                    s.getWriter().getId(), s.getWriter().getDisplayName(),
                    s.getCreatedAt(), s.getSubmittedAt(), s.getCompletedAt(),
                    s.getItems().stream().map(Item::from).toList(),
                    s.getSteps().stream().map(Step::from).toList(),
                    s.getHistories().stream().map(History::from).toList(),
                    Permissions.of(s, viewerId));
        }
    }

    public record Item(
            Long id, int lineNo, Long materialId, String materialName, MaterialType materialType, String materialTypeLabel,
            String unit, BigDecimal ratio, BigDecimal quantity, BigDecimal unitPrice, BigDecimal lossRate, BigDecimal amount
    ) {
        static Item from(CostSheetItem i) {
            return new Item(i.getId(), i.getLineNo(), i.getMaterial().getId(), i.getMaterialName(),
                    i.getMaterialType(), i.getMaterialType().getLabel(), i.getUnit(),
                    i.getRatio(), i.getQuantity(), i.getUnitPrice(), i.getLossRate(), i.getAmount());
        }
    }

    public record Step(
            Long id, int seq, Long approverId, String approverName, String approverDepartment,
            StepStatus status, String statusLabel, String comment, LocalDateTime actedAt
    ) {
        static Step from(ApprovalStep st) {
            return new Step(st.getId(), st.getSeq(), st.getApprover().getId(), st.getApprover().getDisplayName(),
                    st.getApprover().getDepartment(), st.getStatus(), st.getStatus().getLabel(),
                    st.getComment(), st.getActedAt());
        }
    }

    public record History(
            Long id, String actorName, ApprovalAction action, String actionLabel, String comment, LocalDateTime actedAt
    ) {
        static History from(ApprovalHistory h) {
            return new History(h.getId(), h.getActor().getDisplayName(), h.getAction(), h.getAction().getLabel(),
                    h.getComment(), h.getActedAt());
        }
    }

    /** 화면에서 버튼 노출 여부를 결정하는 데 쓰는 권한 정보 */
    /** canSetSalePrice: 최종 결재자 차례라서 승인 시 승인 판매가를 입력할 수 있음 */
    public record Permissions(boolean canEdit, boolean canDelete, boolean canSubmit, boolean canWithdraw,
                              boolean canApprove, boolean canSetSalePrice) {
        static Permissions of(CostSheet s, Long viewerId) {
            boolean writer = s.isWriter(viewerId);
            boolean editable = writer && s.getStatus().isEditable();
            return new Permissions(
                    editable,
                    writer && s.getStatus() == CostStatus.DRAFT,
                    editable,
                    s.isWithdrawable(viewerId),
                    s.isPendingApprover(viewerId),
                    s.isFinalPendingApprover(viewerId));
        }
    }

    /** 제품 판매가 이력 한 줄 = 최종 승인된 원가계산서 한 건 */
    public record PriceHistory(Long costSheetId, String docNo, String productCode, String productName,
                               BigDecimal salePrice, LocalDateTime approvedAt) {
        public static PriceHistory from(CostSheet s) {
            return new PriceHistory(s.getId(), s.getDocNo(), s.getProduct().getCode(), s.getProduct().getName(),
                    s.getApprovedSalePrice(), s.getCompletedAt());
        }
    }

    public record InboxCount(long pending) {
    }
}
