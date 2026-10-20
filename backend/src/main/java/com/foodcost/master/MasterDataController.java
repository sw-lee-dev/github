package com.foodcost.master;

import com.foodcost.master.MasterDto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MasterDataController {

    private final MasterDataService masterDataService;

    @GetMapping("/materials")
    public List<MaterialResponse> materials() {
        return masterDataService.materials();
    }

    @PostMapping("/materials")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','WRITER')")
    public MaterialResponse createMaterial(@Valid @RequestBody MaterialRequest request) {
        return masterDataService.createMaterial(request);
    }

    @PostMapping("/materials/batch")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','WRITER')")
    public List<MaterialResponse> createMaterials(@Valid @RequestBody MaterialBatchRequest request) {
        return masterDataService.createMaterials(request.items());
    }

    @PutMapping("/materials/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','WRITER')")
    public MaterialResponse updateMaterial(@PathVariable Long id, @Valid @RequestBody MaterialRequest request) {
        return masterDataService.updateMaterial(id, request);
    }

    @GetMapping("/products")
    public List<ProductResponse> products() {
        return masterDataService.products();
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','WRITER')")
    public ProductResponse createProduct(@Valid @RequestBody ProductRequest request) {
        return masterDataService.createProduct(request);
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','WRITER')")
    public ProductResponse updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return masterDataService.updateProduct(id, request);
    }
}
