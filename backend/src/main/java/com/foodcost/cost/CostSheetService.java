package com.foodcost.cost;

import com.foodcost.approval.ApprovalAction;
import com.foodcost.approval.StepStatus;
import com.foodcost.common.ApiException;
import com.foodcost.cost.CostSheetDto.*;
import com.foodcost.master.Material;
import com.foodcost.master.MaterialRepository;
import com.foodcost.master.MaterialType;
import com.foodcost.master.Product;
import com.foodcost.master.ProductRepository;
import com.foodcost.user.AuthUser;
import com.foodcost.user.User;
import com.foodcost.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CostSheetService {

    private static final DateTimeFormatter DOC_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final CostSheetRepository costSheetRepository;
    private final ProductRepository productRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;

    // ---------------------------------------------------------------- 조회

    /**
     * @param scope "mine" 이면 내가 작성한 문서, 그 외에는 전체
     */
    public List<Summary> search(AuthUser user, String scope, CostStatus status) {
        Long writerId = "mine".equals(scope) ? user.id() : null;
        return costSheetRepository.search(writerId, status).stream().map(Summary::from).toList();
    }

    public Detail get(AuthUser user, Long id) {
        return Detail.of(find(id), user.id());
    }

    /** 결재함 - 내 차례인 문서 */
    public List<Summary> pendingApprovals(AuthUser user) {
        return costSheetRepository.findByApproverStep(user.id(), List.of(StepStatus.PENDING)).stream()
                .map(Summary::from).toList();
    }

    /** 결재함 - 내가 처리한 문서 */
    public List<Summary> processedApprovals(AuthUser user) {
        return costSheetRepository.findByHistoryActor(user.id(), List.of(ApprovalAction.APPROVED, ApprovalAction.REJECTED))
                .stream().map(Summary::from).toList();
    }

    public InboxCount inboxCount(AuthUser user) {
        return new InboxCount(costSheetRepository.findByApproverStep(user.id(), List.of(StepStatus.PENDING)).size());
    }

    // ---------------------------------------------------------------- 작성/수정/삭제

    @Transactional
    public Detail create(AuthUser user, SaveRequest req) {
        User writer = findUser(user.id());
        CostSheet sheet = new CostSheet(nextDocNo(), writer);
        apply(sheet, req);
        costSheetRepository.save(sheet);
        return Detail.of(sheet, user.id());
    }

    @Transactional
    public Detail update(AuthUser user, Long id, SaveRequest req) {
        CostSheet sheet = find(id);
        if (!sheet.isWriter(user.id())) {
            throw ApiException.forbidden("작성자만 수정할 수 있습니다.");
        }
        apply(sheet, req);
        return Detail.of(sheet, user.id());
    }

    @Transactional
    public void delete(AuthUser user, Long id) {
        CostSheet sheet = find(id);
        if (!sheet.isWriter(user.id())) {
            throw ApiException.forbidden("작성자만 삭제할 수 있습니다.");
        }
        if (sheet.getStatus() != CostStatus.DRAFT) {
            throw ApiException.badRequest("임시저장 상태의 문서만 삭제할 수 있습니다.");
        }
        costSheetRepository.delete(sheet);
    }

    private void apply(CostSheet sheet, SaveRequest req) {
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> ApiException.badRequest("존재하지 않는 제품입니다."));
        sheet.updateContent(req.title().trim(), product, req.productionQty(), req.salePrice(),
                req.laborCost(), req.overheadCost(), req.remark());

        Map<Long, Material> materials = materialRepository
                .findAllById(req.items().stream().map(ItemRequest::materialId).toList()).stream()
                .collect(Collectors.toMap(Material::getId, Function.identity()));
        List<CostSheet.ItemLine> lines = req.items().stream().map(item -> {
            Material material = materials.get(item.materialId());
            if (material == null) {
                throw ApiException.badRequest("존재하지 않는 자재입니다. (id=" + item.materialId() + ")");
            }
            BigDecimal unitPrice = item.unitPrice() != null ? item.unitPrice() : material.getUnitPrice();
            BigDecimal lossRate = item.lossRate() != null ? item.lossRate() : BigDecimal.ZERO;
            if (material.getType() == MaterialType.RAW) {
                if (item.ratio() == null) {
                    throw ApiException.badRequest("원자재 '" + material.getName() + "'의 배합비(%)를 입력하세요.");
                }
                if (lossRate.compareTo(BigDecimal.valueOf(100)) >= 0) {
                    throw ApiException.badRequest("원자재 '" + material.getName() + "'의 손실률은 100% 미만이어야 합니다.");
                }
                return new CostSheet.ItemLine(material, item.ratio(), null, unitPrice, lossRate);
            }
            if (item.quantity() == null) {
                throw ApiException.badRequest("포장자재 '" + material.getName() + "'의 투입량을 입력하세요.");
            }
            return new CostSheet.ItemLine(material, null, item.quantity(), unitPrice, lossRate);
        }).toList();
        sheet.replaceItems(lines);

        List<User> approvers = req.approverIds().stream().map(this::findUser).toList();
        sheet.replaceApprovers(approvers);
    }

    private String nextDocNo() {
        String prefix = "CS-" + LocalDate.now().format(DOC_DATE) + "-";
        long seq = costSheetRepository.countByDocNoStartingWith(prefix) + 1;
        return prefix + String.format("%03d", seq);
    }

    // ---------------------------------------------------------------- 결재

    @Transactional
    public Detail submit(AuthUser user, Long id) {
        CostSheet sheet = find(id);
        sheet.submit(findUser(user.id()));
        return Detail.of(sheet, user.id());
    }

    @Transactional
    public Detail withdraw(AuthUser user, Long id) {
        CostSheet sheet = find(id);
        sheet.withdraw(findUser(user.id()));
        return Detail.of(sheet, user.id());
    }

    @Transactional
    public Detail approve(AuthUser user, Long id, String comment) {
        CostSheet sheet = find(id);
        sheet.approve(findUser(user.id()), blankToNull(comment));
        return Detail.of(sheet, user.id());
    }

    @Transactional
    public Detail reject(AuthUser user, Long id, String comment) {
        CostSheet sheet = find(id);
        sheet.reject(findUser(user.id()), blankToNull(comment));
        return Detail.of(sheet, user.id());
    }

    // ---------------------------------------------------------------- helpers

    private CostSheet find(Long id) {
        return costSheetRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("원가계산서를 찾을 수 없습니다."));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.badRequest("존재하지 않는 사용자입니다. (id=" + id + ")"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
