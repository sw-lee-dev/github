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
 */
@Entity
@Table(name = "cost_sheet_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CostSheetItem {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

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

    /** 생산 1회(배치) 기준 투입량 */
    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    /** 손실률(%) - 세척/가열/불량 등으로 인한 로스 */
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal lossRate;

    /** 금액 = 투입량 × 단가 × (1 + 손실률/100), 원 단위 반올림 */
    @Column(nullable = false, precision = 18, scale = 0)
    private BigDecimal amount;

    CostSheetItem(CostSheet costSheet, int lineNo, Material material, BigDecimal quantity,
                  BigDecimal unitPrice, BigDecimal lossRate) {
        this.costSheet = costSheet;
        this.lineNo = lineNo;
        this.material = material;
        this.materialName = material.getName();
        this.materialType = material.getType();
        this.unit = material.getUnit();
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.lossRate = lossRate;
        this.amount = calculateAmount(quantity, unitPrice, lossRate);
    }

    static BigDecimal calculateAmount(BigDecimal quantity, BigDecimal unitPrice, BigDecimal lossRate) {
        BigDecimal lossFactor = BigDecimal.ONE.add(lossRate.divide(HUNDRED, 6, RoundingMode.HALF_UP));
        return quantity.multiply(unitPrice).multiply(lossFactor).setScale(0, RoundingMode.HALF_UP);
    }
}
