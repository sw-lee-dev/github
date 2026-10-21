package com.foodcost.master;

import com.foodcost.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "product")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Product extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    /** 규격 - 낱개 무게(g) */
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal specWeight;

    /** 규격 - 입수(EA) */
    @Column(nullable = false)
    private int specCount;

    /** 규격 표시 문자열. 저장 시 단위를 붙여 만든다 (예: 20g × 10EA) */
    @Column(length = 100)
    private String spec;

    /** 제품 1개당 무게(g) = 규격 g × EA. 원가계산서의 총 생산량 = 무게 × 생산수량 */
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal unitWeight;

    /** 기준 판매가(원, 개당) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal salePrice;

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    private Product(String code, String name, BigDecimal specWeight, int specCount, BigDecimal salePrice) {
        this.code = code;
        this.name = name;
        this.salePrice = salePrice;
        applySpec(specWeight, specCount);
    }

    public void update(String name, BigDecimal specWeight, int specCount, BigDecimal salePrice, boolean active) {
        this.name = name;
        this.salePrice = salePrice;
        this.active = active;
        applySpec(specWeight, specCount);
    }

    /** 규격(g × EA)으로 표시 문자열과 제품 당 무게를 함께 갱신 */
    private void applySpec(BigDecimal specWeight, int specCount) {
        this.specWeight = specWeight;
        this.specCount = specCount;
        this.spec = specWeight.stripTrailingZeros().toPlainString() + "g × " + specCount + "EA";
        this.unitWeight = specWeight.multiply(BigDecimal.valueOf(specCount));
    }
}
