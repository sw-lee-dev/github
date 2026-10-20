package com.foodcost.config;

import com.foodcost.cost.CostSheetDto.ItemRequest;
import com.foodcost.cost.CostSheetDto.SaveRequest;
import com.foodcost.cost.CostSheetService;
import com.foodcost.master.*;
import com.foodcost.user.AuthUser;
import com.foodcost.user.Role;
import com.foodcost.user.User;
import com.foodcost.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 개발/시연용 샘플 데이터. 모든 계정 비밀번호는 1234.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed-data", havingValue = "true")
public class DataInitializer implements ApplicationRunner {

    private static final String DEFAULT_PASSWORD = "1234";

    private final UserRepository userRepository;
    private final MaterialRepository materialRepository;
    private final ProductRepository productRepository;
    private final CostSheetService costSheetService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        Map<String, User> users = createUsers();
        Map<String, Material> materials = createMaterials();
        Map<String, Product> products = createProducts();
        createSampleSheets(users, materials, products);
        log.info("샘플 데이터 생성 완료 - 계정: writer / leader / plant / exec / admin (비밀번호 {})", DEFAULT_PASSWORD);
    }

    private Map<String, User> createUsers() {
        String pw = passwordEncoder.encode(DEFAULT_PASSWORD);
        List<User> users = List.of(
                user("writer", pw, "김원가", "원가관리팀", "대리", Role.WRITER),
                user("writer2", pw, "정생산", "생산관리팀", "과장", Role.WRITER),
                user("leader", pw, "이팀장", "원가관리팀", "팀장", Role.APPROVER),
                user("plant", pw, "박공장", "제1공장", "공장장", Role.APPROVER),
                user("exec", pw, "최상무", "경영지원본부", "상무", Role.APPROVER),
                user("admin", pw, "관리자", "전산팀", null, Role.ADMIN));
        return userRepository.saveAll(users).stream().collect(Collectors.toMap(User::getUsername, Function.identity()));
    }

    private static User user(String username, String pw, String name, String dept, String position, Role role) {
        return User.builder().username(username).password(pw).name(name)
                .department(dept).position(position).role(role).build();
    }

    private Map<String, Material> createMaterials() {
        List<Material> list = new ArrayList<>(List.of(
                material("M-001", "박력분", MaterialType.RAW, "kg", 1_350),
                material("M-002", "백설탕", MaterialType.RAW, "kg", 1_480),
                material("M-003", "무염버터", MaterialType.RAW, "kg", 12_800),
                material("M-004", "전란액", MaterialType.RAW, "kg", 4_200),
                material("M-005", "탈지분유", MaterialType.RAW, "kg", 7_600),
                material("M-006", "정제소금", MaterialType.RAW, "kg", 600),
                material("M-007", "바닐라향", MaterialType.RAW, "kg", 38_000),
                material("M-008", "코코아파우더", MaterialType.RAW, "kg", 15_500),
                material("M-009", "다크초콜릿칩", MaterialType.RAW, "kg", 11_200),
                material("M-010", "강력분", MaterialType.RAW, "kg", 1_250),
                material("M-011", "이스트", MaterialType.RAW, "kg", 9_800),
                material("M-012", "흰우유", MaterialType.RAW, "L", 1_900),
                material("P-001", "개별포장필름", MaterialType.PACKAGING, "EA", 18),
                material("P-002", "쿠키 트레이", MaterialType.PACKAGING, "EA", 45),
                material("P-003", "단상자(200g)", MaterialType.PACKAGING, "EA", 210),
                material("P-004", "외박스(20입)", MaterialType.PACKAGING, "EA", 650),
                material("P-005", "식빵 비닐봉투", MaterialType.PACKAGING, "EA", 35)));
        return materialRepository.saveAll(list).stream().collect(Collectors.toMap(Material::getCode, Function.identity()));
    }

    private static Material material(String code, String name, MaterialType type, String unit, long price) {
        return Material.builder().code(code).name(name).type(type).unit(unit).unitPrice(BigDecimal.valueOf(price)).build();
    }

    private Map<String, Product> createProducts() {
        List<Product> list = List.of(
                Product.builder().code("FG-001").name("버터쿠키").spec("200g (10입)").salePrice(BigDecimal.valueOf(4_500)).build(),
                Product.builder().code("FG-002").name("초코칩쿠키").spec("180g (9입)").salePrice(BigDecimal.valueOf(4_800)).build(),
                Product.builder().code("FG-003").name("우유식빵").spec("400g").salePrice(BigDecimal.valueOf(3_900)).build());
        return productRepository.saveAll(list).stream().collect(Collectors.toMap(Product::getCode, Function.identity()));
    }

    private void createSampleSheets(Map<String, User> u, Map<String, Material> m, Map<String, Product> p) {
        AuthUser writer = auth(u.get("writer"));
        List<Long> line = List.of(u.get("leader").getId(), u.get("plant").getId(), u.get("exec").getId());

        // 1) 승인 완료된 문서
        var approved = costSheetService.create(writer, new SaveRequest(
                "버터쿠키 2026년 3분기 표준원가", p.get("FG-001").getId(), 2_000, bd(4_500), bd(880_000), bd(430_000),
                "3분기 표준원가 확정 건", butterCookieItems(m, 12_300), line));
        costSheetService.submit(writer, approved.id());
        costSheetService.approve(auth(u.get("leader")), approved.id(), "확인했습니다.");
        costSheetService.approve(auth(u.get("plant")), approved.id(), null);
        costSheetService.approve(auth(u.get("exec")), approved.id(), "승인합니다.");

        // 2) 팀장 승인 후 공장장 결재 대기
        var inProgress = costSheetService.create(writer, new SaveRequest(
                "버터쿠키 2026년 4분기 원가 (버터 단가 인상 반영)", p.get("FG-001").getId(), 2_000, bd(4_500),
                bd(900_000), bd(450_000),
                "무염버터 매입단가 12,300원 → 12,800원 인상분 반영", butterCookieItems(m, 12_800), line));
        costSheetService.submit(writer, inProgress.id());
        costSheetService.approve(auth(u.get("leader")), inProgress.id(), "단가 인상 근거 확인했습니다.");

        // 3) 팀장 결재 대기
        var waiting = costSheetService.create(writer, new SaveRequest(
                "초코칩쿠키 신규 배합 원가", p.get("FG-002").getId(), 1_800, bd(4_800), bd(850_000), bd(420_000),
                "초콜릿칩 함량 15% → 18% 상향", List.of(
                item(m, "M-001", "140", "2"), item(m, "M-002", "75", "2"), item(m, "M-003", "85", "1.5"),
                item(m, "M-004", "35", "3"), item(m, "M-008", "12", "1"), item(m, "M-009", "58", "1"),
                item(m, "M-006", "1.2", "0"),
                item(m, "P-001", "16200", "1"), item(m, "P-002", "1800", "1"), item(m, "P-003", "1800", "1"),
                item(m, "P-004", "90", "0")),
                List.of(u.get("leader").getId(), u.get("plant").getId())));
        costSheetService.submit(writer, waiting.id());

        // 4) 임시저장
        costSheetService.create(writer, new SaveRequest(
                "우유식빵 원가 검토 (초안)", p.get("FG-003").getId(), 3_000, bd(3_900), bd(1_100_000), bd(600_000),
                null, List.of(
                item(m, "M-010", "720", "1.5"), item(m, "M-012", "380", "1"), item(m, "M-002", "60", "1"),
                item(m, "M-003", "45", "1"), item(m, "M-011", "14", "0"), item(m, "M-006", "13", "0"),
                item(m, "P-005", "3000", "1")),
                List.of(u.get("leader").getId())));
    }

    private static List<ItemRequest> butterCookieItems(Map<String, Material> m, long butterPrice) {
        return List.of(
                item(m, "M-001", "160", "2"),
                item(m, "M-002", "90", "2"),
                new ItemRequest(m.get("M-003").getId(), new BigDecimal("110"), BigDecimal.valueOf(butterPrice), new BigDecimal("1.5")),
                item(m, "M-004", "40", "3"),
                item(m, "M-005", "10", "1"),
                item(m, "M-006", "1.5", "0"),
                item(m, "M-007", "0.4", "0"),
                item(m, "P-001", "20000", "1"),
                item(m, "P-002", "2000", "1"),
                item(m, "P-003", "2000", "1"),
                item(m, "P-004", "100", "0"));
    }

    private static ItemRequest item(Map<String, Material> m, String code, String qty, String loss) {
        return new ItemRequest(m.get(code).getId(), new BigDecimal(qty), null, new BigDecimal(loss));
    }

    private static AuthUser auth(User user) {
        return new AuthUser(user.getId(), user.getUsername(), user.getName(), user.getRole());
    }

    private static BigDecimal bd(long v) {
        return BigDecimal.valueOf(v);
    }
}
