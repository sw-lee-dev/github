package com.foodcost.master;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    boolean existsByCode(String code);

    List<Material> findAllByOrderByTypeAscCodeAsc();
}
