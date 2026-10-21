package com.foodcost.cost;

import com.foodcost.master.Material;
import com.foodcost.master.MaterialType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 원가계산서의 배합(BOM) 품목. 자재명/단가는 작성 시점 값으로 보관한다.
 * <pre>
 * 원자재  : 투입량 = 총 생산량(kg) × 배합비% ÷ (1 − 손실률%)   ← 단위가 g 이면 × 1000
 *           금액   = 투입량 × 단가                            (손실은 투입량에 이미 반영)
 * 포장자재: 투입량 = 직접 입력
 *           금액   = 투입량 × 단가 × (1 + 손실률%)
 * </pre>
 */
@Entity
@Table(name = "cost_sheet_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CostSheetItem {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal THOUSAND = BigDecimal.valueOf(1000);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cost_sheet_id")
    private CostSheet costSheet;

    @Column(nullable = false)
    private int lineNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "material_id")
    private Material material;

    @Column(nullable = false, length = 100)
    private String materialName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MaterialType materialType;

    @Column(nullable = false, length = 10)
    private String unit;

    /** 배합비(%) - 원자재만 사용, 포장자재는 null */
    @Column(precision = 7, scale = 3)
    private BigDecimal ratio;

    /** 생산 1회(배치) 기준 투입량. 원자재는 배합비로 계산, 포장자재는 입력값 */
    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    /** 손실률(%) - 세척/가열/불량 등으로 인한 로스 */
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal lossRate;

    /** 금액(원, 소수 둘째자리 반올림) */
    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    /** 원자재 품목: 배합비로 투입량을 계산한다. */
    static CostSheetItem raw(CostSheet costSheet, int lineNo, Material material, BigDecimal ratio,
                             BigDecimal unitPrice, BigDecimal lossRate, BigDecimal totalOutputKg) {
        CostSheetItem item = new CostSheetItem(costSheet, lineNo, material, unitPrice, lossRate);
        item.ratio = ratio;
        item.quantity = rawQuantity(totalOutputKg, ratio, lossRate, material.getUnit());
        item.amount = item.quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
        return item;
    }

    /** 포장자재 품목: 투입량을 직접 받는다. */
    static CostSheetItem packaging(CostSheet costSheet, int lineNo, Material material, BigDecimal quantity,
                                   BigDecimal unitPrice, BigDecimal lossRate) {
        CostSheetItem item = new CostSheetItem(costSheet, lineNo, material, unitPrice, lossRate);
        item.quantity = quantity;
        BigDecimal lossFactor = BigDecimal.ONE.add(lossRate.divide(HUNDRED, 6, RoundingMode.HALF_UP));
        item.amount = quantity.multiply(unitPrice).multiply(lossFactor).setScale(2, RoundingMode.HALF_UP);
        return item;
    }

    private CostSheetItem(CostSheet costSheet, int lineNo, Material material, BigDecimal unitPrice, BigDecimal lossRate) {
        this.costSheet = costSheet;
        this.lineNo = lineNo;
        this.material = material;
        this.materialName = material.getName();
        this.materialType = material.getType();
        this.unit = material.getUnit();
        this.unitPrice = unitPrice;
        this.lossRate = lossRate;
    }

    /** 총 생산량(kg) × 배합비% ÷ (1 − 손실률%). 자재 단위가 g 이면 g 으로 환산. 손실률은 100% 미만이어야 한다. */
    static BigDecimal rawQuantity(BigDecimal totalOutputKg, BigDecimal ratio, BigDecimal lossRate, String unit) {
        BigDecimal yield = BigDecimal.ONE.subtract(lossRate.divide(HUNDRED, 6, RoundingMode.HALF_UP));
        BigDecimal kg = totalOutputKg.multiply(ratio).divide(HUNDRED, 10, RoundingMode.HALF_UP)
                .divide(yield, 10, RoundingMode.HALF_UP);
        BigDecimal qty = "g".equalsIgnoreCase(unit) ? kg.multiply(THOUSAND) : kg;
        return qty.setScale(4, RoundingMode.HALF_UP);
    }
}
