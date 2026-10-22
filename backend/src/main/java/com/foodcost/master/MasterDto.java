package com.foodcost.master;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public final class MasterDto {

    private MasterDto() {
    }

    /** 자재코드는 구분(M/P)에 따라 서버에서 자동 채번하므로 받지 않는다. */
    public record MaterialRequest(
            @NotBlank(message = "자재명을 입력하세요.") @Size(max = 100) String name,
            @NotNull(message = "자재구분을 선택하세요.") MaterialType type,
            @NotBlank(message = "단위를 입력하세요.") @Size(max = 10) String unit,
            @NotNull(message = "단가를 입력하세요.") @DecimalMin(value = "0", message = "단가는 0 이상이어야 합니다.") BigDecimal unitPrice,
            Boolean active
    ) {
    }

    /** 여러 자재를 한 번에 등록. 요청 순서대로 코드가 채번된다. */
    public record MaterialBatchRequest(
            @NotEmpty(message = "등록할 자재를 1개 이상 입력하세요.")
            @Size(max = 100, message = "한 번에 최대 100개까지 등록할 수 있습니다.")
            List<@Valid MaterialRequest> items
    ) {
    }

    public record MaterialResponse(
            Long id, String code, String name, MaterialType type, String typeLabel,
            String unit, BigDecimal unitPrice, boolean active
    ) {
        public static MaterialResponse from(Material m) {
            return new MaterialResponse(m.getId(), m.getCode(), m.getName(), m.getType(), m.getType().getLabel(),
                    m.getUnit(), m.getUnitPrice(), m.isActive());
        }
    }

    /**
     * 제품코드는 자동 채번(FG-0001), 규격 문자열과 제품 당 무게는 g × EA 로 서버가 만든다.
     * 판매가는 원가계산서 최종 승인으로만 책정되므로 받지 않는다.
     */
    public record ProductRequest(
            @NotBlank(message = "제품명을 입력하세요.") @Size(max = 100) String name,
            @NotNull(message = "규격의 무게(g)를 입력하세요.") @DecimalMin(value = "1", message = "규격의 무게(g)는 1 이상이어야 합니다.")
            @Digits(integer = 9, fraction = 0, message = "규격의 무게(g)는 정수만 입력할 수 있습니다.") BigDecimal specWeight,
            @NotNull(message = "규격의 입수(EA)를 입력하세요.") @Min(value = 1, message = "규격의 입수(EA)는 1 이상이어야 합니다.") Integer specCount,
            Boolean active
    ) {
    }

    /** editable/lockReason: 최초 상신 후(반려·회수 전) 또는 판매가 책정 후에는 수정 불가 */
    public record ProductResponse(Long id, String code, String name, BigDecimal specWeight, int specCount,
                                  String spec, BigDecimal unitWeight, BigDecimal salePrice, boolean active,
                                  boolean editable, String lockReason) {
        public static ProductResponse from(Product p, boolean inApproval) {
            String lockReason = p.lockReason(inApproval);
            return new ProductResponse(p.getId(), p.getCode(), p.getName(), p.getSpecWeight(), p.getSpecCount(),
                    p.getSpec(), p.getUnitWeight(), p.getSalePrice(), p.isActive(), lockReason == null, lockReason);
        }
    }
}
