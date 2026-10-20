package com.foodcost.master;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsByCode(String code);

    List<Product> findAllByOrderByCodeAsc();
}
