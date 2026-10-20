package com.foodcost.master;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    List<Material> findAllByOrderByTypeAscCodeAsc();

    @Query("select m.code from Material m where m.code like concat(:prefix, '-%')")
    List<String> findCodesByPrefix(@Param("prefix") String prefix);
}
