package com.foodcost.master;

import com.foodcost.common.ApiException;
import com.foodcost.master.MasterDto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MasterDataService {

    private final MaterialRepository materialRepository;
    private final ProductRepository productRepository;

    public List<MaterialResponse> materials() {
        return materialRepository.findAllByOrderByTypeAscCodeAsc().stream().map(MaterialResponse::from).toList();
    }

    @Transactional
    public MaterialResponse createMaterial(MaterialRequest req) {
        if (materialRepository.existsByCode(req.code())) {
            throw ApiException.conflict("이미 등록된 자재코드입니다: " + req.code());
        }
        Material material = Material.builder()
                .code(req.code()).name(req.name()).type(req.type())
                .unit(req.unit()).unitPrice(req.unitPrice())
                .build();
        return MaterialResponse.from(materialRepository.save(material));
    }

    @Transactional
    public MaterialResponse updateMaterial(Long id, MaterialRequest req) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("자재를 찾을 수 없습니다."));
        material.update(req.name(), req.type(), req.unit(), req.unitPrice(), req.active() == null || req.active());
        return MaterialResponse.from(material);
    }

    public List<ProductResponse> products() {
        return productRepository.findAllByOrderByCodeAsc().stream().map(ProductResponse::from).toList();
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest req) {
        if (productRepository.existsByCode(req.code())) {
            throw ApiException.conflict("이미 등록된 제품코드입니다: " + req.code());
        }
        Product product = Product.builder()
                .code(req.code()).name(req.name()).spec(req.spec()).salePrice(req.salePrice())
                .build();
        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("제품을 찾을 수 없습니다."));
        product.update(req.name(), req.spec(), req.salePrice(), req.active() == null || req.active());
        return ProductResponse.from(product);
    }
}
