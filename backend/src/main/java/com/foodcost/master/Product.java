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

    /** 기준 판매가(원, 개당). 등록 시에는 비어 있고, 원가계산서가 최종 승인될 때 책정된다 */
    @Column(precision = 15, scale = 2)
    private BigDecimal salePrice;

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    private Product(String code, String name, BigDecimal specWeight, int specCount) {
        this.code = code;
        this.name = name;
        applySpec(specWeight, specCount);
    }

    /**
     * 수정할 수 없는 이유. 수정 가능하면 null.
     * 판매가가 책정되면(최초 승인 이후) 영구히 잠기고, 그 전에는 결재중인 원가계산서가 있는 동안만 잠긴다
     * (최초 상신이 반려·회수되면 다시 수정 가능).
     */
    public String lockReason(boolean inApproval) {
        if (salePrice != null) {
            return "판매가가 책정된 제품은 수정할 수 없습니다.";
        }
        return inApproval ? "결재 진행 중인 원가계산서가 있어 수정할 수 없습니다." : null;
    }

    /** 판매가는 결재로만 바뀌므로 여기서 받지 않는다 */
    public void update(String name, BigDecimal specWeight, int specCount, boolean active) {
        this.name = name;
        this.active = active;
        applySpec(specWeight, specCount);
    }

    /** 원가계산서 최종 승인 시 승인 판매가로 기준 판매가를 바꾼다 */
    public void changeSalePrice(BigDecimal salePrice) {
        this.salePrice = salePrice;
    }

    /** 규격(g × EA)으로 표시 문자열과 제품 당 무게를 함께 갱신 */
    private void applySpec(BigDecimal specWeight, int specCount) {
        this.specWeight = specWeight;
        this.specCount = specCount;
        this.spec = specWeight.stripTrailingZeros().toPlainString() + "g × " + specCount + "EA";
        this.unitWeight = specWeight.multiply(BigDecimal.valueOf(specCount));
    }
}
