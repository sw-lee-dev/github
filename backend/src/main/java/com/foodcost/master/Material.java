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

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    private Material(String code, String name, MaterialType type, String unit, BigDecimal unitPrice) {
        this.code = code;
        this.name = name;
        this.type = type;
        this.unit = unit;
        this.unitPrice = unitPrice;
    }

    public void update(String name, MaterialType type, String unit, BigDecimal unitPrice, boolean active) {
        this.name = name;
        this.type = type;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.active = active;
    }
}
