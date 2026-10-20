package com.foodcost.master;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByOrderByCodeAsc();

    @Query("select p.code from Product p where p.code like concat(:prefix, '-%')")
    List<String> findCodesByPrefix(@Param("prefix") String prefix);
}
