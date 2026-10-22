package com.foodcost.master;

import com.foodcost.common.ApiException;
import com.foodcost.master.MasterDto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MasterDataService {

    /** 제품코드 접두어 (Finished Goods) */
    public static final String PRODUCT_CODE_PREFIX = "FG";

    private final MaterialRepository materialRepository;
    private final ProductRepository productRepository;
    private final ProductApprovalStatus productApprovalStatus;

    public List<MaterialResponse> materials() {
        return materialRepository.findAllByOrderByTypeAscCodeAsc().stream().map(MaterialResponse::from).toList();
    }

    @Transactional
    public MaterialResponse createMaterial(MaterialRequest req) {
        return createMaterials(List.of(req)).get(0);
    }

    /**
     * 자재 일괄 등록. 구분별로 기존 최대 순번 다음부터 요청 순서대로 코드를 부여한다.
     * 예) 기존 M-0012, P-0005 가 있을 때 [원재료, 포장재, 원재료] → M-0013, P-0006, M-0014
     */
    @Transactional
    public List<MaterialResponse> createMaterials(List<MaterialRequest> requests) {
        Map<MaterialType, Integer> lastSeq = new EnumMap<>(MaterialType.class);
        requests.forEach(MasterDataService::checkGravity);
        return requests.stream().map(req -> {
            String prefix = req.type().getCodePrefix();
            int seq = lastSeq.computeIfAbsent(req.type(),
                    t -> CodeSequence.maxSeq(prefix, materialRepository.findCodesByPrefix(prefix))) + 1;
            lastSeq.put(req.type(), seq);

            Material material = Material.builder()
                    .code(CodeSequence.format(prefix, seq)).name(req.name()).type(req.type())
                    .unit(req.unit()).unitPrice(req.unitPrice()).specificGravity(req.specificGravity())
                    .build();
            return MaterialResponse.from(materialRepository.save(material));
        }).toList();
    }

    @Transactional
    public MaterialResponse updateMaterial(Long id, MaterialRequest req) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("자재를 찾을 수 없습니다."));
        if (material.getType() != req.type()) {
            throw ApiException.badRequest("자재 구분은 변경할 수 없습니다. (자재코드가 구분에 따라 정해집니다)");
        }
        checkGravity(req);
        material.update(req.name(), req.type(), req.unit(), req.unitPrice(), req.specificGravity(),
                req.active() == null || req.active());
        return MaterialResponse.from(material);
    }

    /** kg·g 이 아닌 원재료는 투입량을 kg 으로 환산할 비중이 있어야 한다 */
    private static void checkGravity(MaterialRequest req) {
        if (Material.requiresGravity(req.type(), req.unit()) && req.specificGravity() == null) {
            throw ApiException.badRequest(req.name() + ": kg 단위가 아닌 원재료는 비중(1 " + req.unit().trim()
                    + "당 kg)을 입력하세요.");
        }
    }

    public List<ProductResponse> products() {
        Set<Long> inApproval = productApprovalStatus.productIdsInApproval();
        return productRepository.findAllByOrderByCodeAsc().stream()
                .map(p -> ProductResponse.from(p, inApproval.contains(p.getId()))).toList();
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest req) {
        String code = CodeSequence.next(PRODUCT_CODE_PREFIX, productRepository.findCodesByPrefix(PRODUCT_CODE_PREFIX));
        Product product = Product.builder()
                .code(code).name(req.name()).specWeight(req.specWeight()).specCount(req.specCount())
                .build();
        return ProductResponse.from(productRepository.save(product), false);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("제품을 찾을 수 없습니다."));
        String lockReason = product.lockReason(productApprovalStatus.productIdsInApproval().contains(id));
        if (lockReason != null) {
            throw ApiException.badRequest(lockReason);
        }
        product.update(req.name(), req.specWeight(), req.specCount(), req.active() == null || req.active());
        return ProductResponse.from(product, false);
    }

    /** 판매가가 책정된 제품은 다른 항목은 잠기지만 판매여부(단종 등)는 바꿀 수 있다 */
    @Transactional
    public ProductResponse changeProductActive(Long id, boolean active) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("제품을 찾을 수 없습니다."));
        if (product.getSalePrice() == null) {
            throw ApiException.badRequest("판매여부만 따로 변경하는 것은 판매가가 책정된 제품만 가능합니다.");
        }
        product.changeActive(active);
        return ProductResponse.from(product, productApprovalStatus.productIdsInApproval().contains(id));
    }
}
