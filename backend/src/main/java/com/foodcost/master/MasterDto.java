package com.foodcost.master;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public final class MasterDto {

    private MasterDto() {
    }

    public record MaterialRequest(
            @NotBlank(message = "자재코드를 입력하세요.") @Size(max = 30) String code,
            @NotBlank(message = "자재명을 입력하세요.") @Size(max = 100) String name,
            @NotNull(message = "자재구분을 선택하세요.") MaterialType type,
            @NotBlank(message = "단위를 입력하세요.") @Size(max = 10) String unit,
            @NotNull(message = "단가를 입력하세요.") @DecimalMin(value = "0", message = "단가는 0 이상이어야 합니다.") BigDecimal unitPrice,
            Boolean active
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

    public record ProductRequest(
            @NotBlank(message = "제품코드를 입력하세요.") @Size(max = 30) String code,
            @NotBlank(message = "제품명을 입력하세요.") @Size(max = 100) String name,
            @Size(max = 100) String spec,
            @NotNull(message = "판매가를 입력하세요.") @DecimalMin(value = "0", message = "판매가는 0 이상이어야 합니다.") BigDecimal salePrice,
            Boolean active
    ) {
    }

    public record ProductResponse(Long id, String code, String name, String spec, BigDecimal salePrice, boolean active) {
        public static ProductResponse from(Product p) {
            return new ProductResponse(p.getId(), p.getCode(), p.getName(), p.getSpec(), p.getSalePrice(), p.isActive());
        }
    }
}
