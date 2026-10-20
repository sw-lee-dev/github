package com.foodcost.config;

import com.foodcost.cost.CostSheetDto.ItemRequest;
import com.foodcost.cost.CostSheetDto.SaveRequest;
import com.foodcost.cost.CostSheetService;
import com.foodcost.master.MasterDataService;
import com.foodcost.master.MasterDto.MaterialRequest;
import com.foodcost.master.MasterDto.ProductRequest;
import com.foodcost.master.MaterialType;
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
    private final MasterDataService masterDataService;
    private final CostSheetService costSheetService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        Map<String, User> users = createUsers();
        Map<String, Long> materials = createMaterials();
        Map<String, Long> products = createProducts();
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

    /** 자재코드는 서비스에서 자동 채번된다: 원재료 M-0001~M-0012, 포장재 P-0001~P-0005 */
    private Map<String, Long> createMaterials() {
        List<MaterialRequest> list = List.of(
                material("박력분", MaterialType.RAW, "kg", 1_350),
                material("백설탕", MaterialType.RAW, "kg", 1_480),
                material("무염버터", MaterialType.RAW, "kg", 12_800),
                material("전란액", MaterialType.RAW, "kg", 4_200),
                material("탈지분유", MaterialType.RAW, "kg", 7_600),
                material("정제소금", MaterialType.RAW, "kg", 600),
                material("바닐라향", MaterialType.RAW, "kg", 38_000),
                material("코코아파우더", MaterialType.RAW, "kg", 15_500),
                material("다크초콜릿칩", MaterialType.RAW, "kg", 11_200),
                material("강력분", MaterialType.RAW, "kg", 1_250),
                material("이스트", MaterialType.RAW, "kg", 9_800),
                material("흰우유", MaterialType.RAW, "L", 1_900),
                material("개별포장필름", MaterialType.PACKAGING, "EA", 18),
                material("쿠키 트레이", MaterialType.PACKAGING, "EA", 45),
                material("단상자(200g)", MaterialType.PACKAGING, "EA", 210),
                material("외박스(20입)", MaterialType.PACKAGING, "EA", 650),
                material("식빵 비닐봉투", MaterialType.PACKAGING, "EA", 35));
        return masterDataService.createMaterials(list).stream()
                .collect(Collectors.toMap(r -> r.code(), r -> r.id()));
    }

    private static MaterialRequest material(String name, MaterialType type, String unit, long price) {
        return new MaterialRequest(name, type, unit, BigDecimal.valueOf(price), true);
    }

    /** 제품코드는 서비스에서 자동 채번된다: FG-0001~FG-0003 */
    private Map<String, Long> createProducts() {
        return List.of(
                        new ProductRequest("버터쿠키", "200g (10입)", BigDecimal.valueOf(4_500), true),
                        new ProductRequest("초코칩쿠키", "180g (9입)", BigDecimal.valueOf(4_800), true),
                        new ProductRequest("우유식빵", "400g", BigDecimal.valueOf(3_900), true))
                .stream()
                .map(masterDataService::createProduct)
                .collect(Collectors.toMap(r -> r.code(), r -> r.id()));
    }

    private void createSampleSheets(Map<String, User> u, Map<String, Long> m, Map<String, Long> p) {
        AuthUser writer = auth(u.get("writer"));
        List<Long> line = List.of(u.get("leader").getId(), u.get("plant").getId(), u.get("exec").getId());

        // 1) 승인 완료된 문서
        var approved = costSheetService.create(writer, new SaveRequest(
                "버터쿠키 2026년 3분기 표준원가", p.get("FG-0001"), 2_000, bd(4_500), bd(880_000), bd(430_000),
                "3분기 표준원가 확정 건", butterCookieItems(m, 12_300), line));
        costSheetService.submit(writer, approved.id());
        costSheetService.approve(auth(u.get("leader")), approved.id(), "확인했습니다.");
        costSheetService.approve(auth(u.get("plant")), approved.id(), null);
        costSheetService.approve(auth(u.get("exec")), approved.id(), "승인합니다.");

        // 2) 팀장 승인 후 공장장 결재 대기
        var inProgress = costSheetService.create(writer, new SaveRequest(
                "버터쿠키 2026년 4분기 원가 (버터 단가 인상 반영)", p.get("FG-0001"), 2_000, bd(4_500),
                bd(900_000), bd(450_000),
                "무염버터 매입단가 12,300원 → 12,800원 인상분 반영", butterCookieItems(m, 12_800), line));
        costSheetService.submit(writer, inProgress.id());
        costSheetService.approve(auth(u.get("leader")), inProgress.id(), "단가 인상 근거 확인했습니다.");

        // 3) 팀장 결재 대기
        var waiting = costSheetService.create(writer, new SaveRequest(
                "초코칩쿠키 신규 배합 원가", p.get("FG-0002"), 1_800, bd(4_800), bd(850_000), bd(420_000),
                "초콜릿칩 함량 15% → 18% 상향", List.of(
                item(m, "M-0001", "140", "2"), item(m, "M-0002", "75", "2"), item(m, "M-0003", "85", "1.5"),
                item(m, "M-0004", "35", "3"), item(m, "M-0008", "12", "1"), item(m, "M-0009", "58", "1"),
                item(m, "M-0006", "1.2", "0"),
                item(m, "P-0001", "16200", "1"), item(m, "P-0002", "1800", "1"), item(m, "P-0003", "1800", "1"),
                item(m, "P-0004", "90", "0")),
                List.of(u.get("leader").getId(), u.get("plant").getId())));
        costSheetService.submit(writer, waiting.id());

        // 4) 임시저장
        costSheetService.create(writer, new SaveRequest(
                "우유식빵 원가 검토 (초안)", p.get("FG-0003"), 3_000, bd(3_900), bd(1_100_000), bd(600_000),
                null, List.of(
                item(m, "M-0010", "720", "1.5"), item(m, "M-0012", "380", "1"), item(m, "M-0002", "60", "1"),
                item(m, "M-0003", "45", "1"), item(m, "M-0011", "14", "0"), item(m, "M-0006", "13", "0"),
                item(m, "P-0005", "3000", "1")),
                List.of(u.get("leader").getId())));
    }

    private static List<ItemRequest> butterCookieItems(Map<String, Long> m, long butterPrice) {
        return List.of(
                item(m, "M-0001", "160", "2"),
                item(m, "M-0002", "90", "2"),
                new ItemRequest(m.get("M-0003"), new BigDecimal("110"), BigDecimal.valueOf(butterPrice), new BigDecimal("1.5")),
                item(m, "M-0004", "40", "3"),
                item(m, "M-0005", "10", "1"),
                item(m, "M-0006", "1.5", "0"),
                item(m, "M-0007", "0.4", "0"),
                item(m, "P-0001", "20000", "1"),
                item(m, "P-0002", "2000", "1"),
                item(m, "P-0003", "2000", "1"),
                item(m, "P-0004", "100", "0"));
    }

    private static ItemRequest item(Map<String, Long> m, String code, String qty, String loss) {
        return new ItemRequest(m.get(code), new BigDecimal(qty), null, new BigDecimal(loss));
    }

    private static AuthUser auth(User user) {
        return new AuthUser(user.getId(), user.getUsername(), user.getName(), user.getRole());
    }

    private static BigDecimal bd(long v) {
        return BigDecimal.valueOf(v);
    }
}
