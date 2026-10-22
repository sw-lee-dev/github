package com.foodcost.cost;

import com.foodcost.cost.CostSheetDto.PriceHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 제품 탭의 판매가 이력 팝업. 판매가는 원가계산서 결재로 정해지므로 원가 모듈에서 제공한다 */
@RestController
@RequiredArgsConstructor
public class ProductPriceController {

    private final CostSheetService costSheetService;

    @GetMapping("/api/products/{id}/price-history")
    public List<PriceHistory> priceHistory(@PathVariable Long id) {
        return costSheetService.priceHistory(id);
    }
}
