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

    /** 규격 (예: 200g x 1입) */
    @Column(length = 100)
    private String spec;

    /** 제품 1개당 무게(g). 원가계산서의 총 생산량 = 무게 × 생산수량 */
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal unitWeight;

    /** 기준 판매가(원, 개당) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal salePrice;

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    private Product(String code, String name, String spec, BigDecimal unitWeight, BigDecimal salePrice) {
        this.code = code;
        this.name = name;
        this.spec = spec;
        this.unitWeight = unitWeight;
        this.salePrice = salePrice;
    }

    public void update(String name, String spec, BigDecimal unitWeight, BigDecimal salePrice, boolean active) {
        this.name = name;
        this.spec = spec;
        this.unitWeight = unitWeight;
        this.salePrice = salePrice;
        this.active = active;
    }
}
