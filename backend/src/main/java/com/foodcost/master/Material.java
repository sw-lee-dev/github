package com.foodcost.master;

import com.foodcost.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 원재료/포장재 기준정보. 단가는 원가 작성 시점에 원가계산서 품목으로 복사(스냅샷)된다.
 */
@Entity
@Table(name = "material")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Material extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MaterialType type;

    /** 단위 (kg, g, L, EA 등) */
    @Column(nullable = false, length = 10)
    private String unit;

    /** 단위당 단가(원) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    /**
     * 비중 = 1 단위당 kg (예: 흰우유 1 L = 1.03 kg). kg·g 이 아닌 원재료만 입력하며,
     * 원가계산서의 원자재 투입량 합계를 kg 으로 환산할 때 곱한다.
     */
    @Column(precision = 12, scale = 4)
    private BigDecimal specificGravity;

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    private Material(String code, String name, MaterialType type, String unit, BigDecimal unitPrice,
                     BigDecimal specificGravity) {
        this.code = code;
        this.name = name;
        this.type = type;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.specificGravity = requiresGravity(type, unit) ? specificGravity : null;
    }

    public void update(String name, MaterialType type, String unit, BigDecimal unitPrice, BigDecimal specificGravity,
                       boolean active) {
        this.name = name;
        this.type = type;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.specificGravity = requiresGravity(type, unit) ? specificGravity : null;
        this.active = active;
    }

    /** 비중 입력 대상: kg·g 이 아닌 단위의 원재료 (g 은 1/1000 로 자동 환산) */
    public static boolean requiresGravity(MaterialType type, String unit) {
        return type == MaterialType.RAW && !isKg(unit) && !"g".equalsIgnoreCase(unit.trim());
    }

    private static boolean isKg(String unit) {
        return "kg".equalsIgnoreCase(unit.trim());
    }

    /** 1 단위당 kg. kg → 1, g → 0.001, 그 외 → 비중 (없으면 null) */
    public BigDecimal kgPerUnit() {
        if (isKg(unit)) {
            return BigDecimal.ONE;
        }
        if ("g".equalsIgnoreCase(unit.trim())) {
            return new BigDecimal("0.001");
        }
        return specificGravity;
    }
}
