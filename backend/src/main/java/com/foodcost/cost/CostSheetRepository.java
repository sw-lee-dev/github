package com.foodcost.cost;

import com.foodcost.approval.ApprovalAction;
import com.foodcost.approval.StepStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CostSheetRepository extends JpaRepository<CostSheet, Long> {

    long countByDocNoStartingWith(String prefix);

    @Query("""
            select s from CostSheet s
              join fetch s.product
              join fetch s.writer
             where (:writerId is null or s.writer.id = :writerId)
               and (:status is null or s.status = :status)
             order by s.id desc
            """)
    List<CostSheet> search(@Param("writerId") Long writerId, @Param("status") CostStatus status);

    @Query("select distinct s.product.id from CostSheet s where s.status = :status")
    List<Long> findProductIdsByStatus(@Param("status") CostStatus status);

    /** 제품의 판매가 이력: 최종 승인된 문서를 승인일시 최신순으로 */
    @Query("""
            select s from CostSheet s
              join fetch s.product
             where s.product.id = :productId
               and s.status = com.foodcost.cost.CostStatus.APPROVED
             order by s.completedAt desc, s.id desc
            """)
    List<CostSheet> findApprovedByProduct(@Param("productId") Long productId);

    /** 특정 결재자의 단계 상태로 문서 조회 (결재함) */
    @Query("""
            select distinct s from CostSheet s
              join fetch s.product
              join fetch s.writer
              join s.steps st
             where st.approver.id = :approverId
               and st.status in :stepStatuses
             order by s.id desc
            """)
    List<CostSheet> findByApproverStep(@Param("approverId") Long approverId,
                                       @Param("stepStatuses") Collection<StepStatus> stepStatuses);

    /** 내가 승인/반려 처리한 적이 있는 문서 (재상신으로 결재선이 초기화돼도 이력 기준으로 조회) */
    @Query("""
            select distinct s from CostSheet s
              join fetch s.product
              join fetch s.writer
              join s.histories h
             where h.actor.id = :actorId
               and h.action in :actions
             order by s.id desc
            """)
    List<CostSheet> findByHistoryActor(@Param("actorId") Long actorId,
                                       @Param("actions") Collection<ApprovalAction> actions);
}
