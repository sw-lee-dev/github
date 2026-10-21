package com.foodcost;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 샘플 데이터(DataInitializer) 위에서 원가 작성 → 상신 → 승인/반려 흐름을 API 레벨로 검증한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CostSheetFlowTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper om;

    @Test
    void 로그인하지_않으면_401() throws Exception {
        mvc.perform(get("/api/cost-sheets")).andExpect(status().isUnauthorized());
    }

    @Test
    void 비밀번호가_틀리면_401() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"writer\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 원가가_서버에서_계산된다() throws Exception {
        String writer = login("writer");
        // 제품 FG-0001(버터쿠키 20g × 10EA = 200g) × 100개 → 총 생산량 20kg
        // 원재료 손실률 20% → 총 투입량 = 20 ÷ (1 − 0.2) = 25kg
        // 원자재 투입량 = 20kg × 배합비, 금액 = 투입량 × 단가 (원자재 행에는 손실률 없음)
        //   박력분 50% → 10kg × 1,000 = 10,000 / 백설탕 50% → 10kg × 1,000 = 10,000 → 원자재 합계 20,000
        //   원재료비 = 20,000 ÷ (1 − 0.2) = 25,000
        // 포장자재 금액 = 투입량 × 단가 × (1 + 손실률): 필름 1,000EA × 20원 × 1.1 = 22,000
        Map<String, Object> body = new HashMap<>(sheetBody(List.of(
                Map.of("materialId", materialId(writer, "M-0001"), "ratio", 50, "unitPrice", 1000),
                Map.of("materialId", materialId(writer, "M-0002"), "ratio", 50, "unitPrice", 1000, "lossRate", 30),
                Map.of("materialId", materialId(writer, "P-0001"), "quantity", 1000, "unitPrice", 20, "lossRate", 10)
        ), List.of(userId(writer, "leader"))));
        body.put("rawLossRate", 20);

        JsonNode sheet = json(mvc.perform(post("/api/cost-sheets").header("Authorization", writer)
                .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body)))
                .andExpect(status().isCreated()));

        assertThat(sheet.get("unitWeight").decimalValue()).isEqualByComparingTo("200");
        assertThat(sheet.get("totalOutput").decimalValue()).isEqualByComparingTo("20");
        assertThat(sheet.get("rawLossRate").decimalValue()).isEqualByComparingTo("20");
        assertThat(sheet.get("totalInput").decimalValue()).isEqualByComparingTo("25");
        assertThat(sheet.at("/items/0/ratio").decimalValue()).isEqualByComparingTo("50");
        assertThat(sheet.at("/items/0/quantity").decimalValue()).isEqualByComparingTo("10");
        // 원자재 행에 손실률을 보내도 무시된다
        assertThat(sheet.at("/items/1/quantity").decimalValue()).isEqualByComparingTo("10");
        assertThat(sheet.at("/items/1/lossRate").decimalValue()).isEqualByComparingTo("0");
        assertThat(sheet.at("/items/2/ratio").isNull()).isTrue();
        assertThat(sheet.get("rawSubtotal").decimalValue()).isEqualByComparingTo("20000");
        // 총원가 = 25,000 + 22,000 + 노무비 50,000 + 경비 20,000 = 117,000 / 100개 = 1,170원, 판매가 2,500원 → 마진 53.2%
        assertThat(sheet.get("materialCost").decimalValue()).isEqualByComparingTo("25000");
        assertThat(sheet.get("packagingCost").decimalValue()).isEqualByComparingTo("22000");
        assertThat(sheet.get("totalCost").decimalValue()).isEqualByComparingTo("117000");
        assertThat(sheet.get("unitCost").decimalValue()).isEqualByComparingTo("1170");
        assertThat(sheet.get("marginRate").decimalValue()).isEqualByComparingTo("53.2");
        assertThat(sheet.get("status").asText()).isEqualTo("DRAFT");
        assertThat(sheet.get("docNo").asText()).startsWith("CS-");
    }

    @Test
    void 같은_자재를_두_번_입력하면_400() throws Exception {
        String writer = login("writer");
        long flour = materialId(writer, "M-0001");
        JsonNode err = json(mvc.perform(post("/api/cost-sheets").header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(sheetBody(List.of(
                                Map.of("materialId", flour, "ratio", 50),
                                Map.of("materialId", flour, "ratio", 50)), List.of(userId(writer, "leader"))))))
                .andExpect(status().isBadRequest()));
        assertThat(err.get("message").asText()).isEqualTo("같은 자재를 두 번 입력할 수 없습니다: 박력분");
    }

    @Test
    void 원자재는_배합비_포장자재는_투입량이_필수() throws Exception {
        String writer = login("writer");
        List<Long> line = List.of(userId(writer, "leader"));
        for (Map<String, Object> item : List.of(
                Map.<String, Object>of("materialId", materialId(writer, "M-0001"), "quantity", 10),
                Map.<String, Object>of("materialId", materialId(writer, "P-0001"), "ratio", 10))) {
            mvc.perform(post("/api/cost-sheets").header("Authorization", writer)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(om.writeValueAsString(sheetBody(List.of(item), line))))
                    .andExpect(status().isBadRequest());
        }
        // 원재료 손실률은 100% 미만
        Map<String, Object> body = new HashMap<>(sheetBody(defaultItems(writer), line));
        body.put("rawLossRate", 100);
        mvc.perform(post("/api/cost-sheets").header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    /** 롤백을 확인해야 하므로 테스트 트랜잭션 없이 실행한다 (성공 건은 커밋되어 남는다). */
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void 저장후_상신은_한번에_처리되고_실패하면_저장도_안된다() throws Exception {
        String writer = login("writer");
        int before = json(mvc.perform(get("/api/cost-sheets?scope=mine").header("Authorization", writer))).size();

        // 결재선 없이 저장+상신 → 400, 문서가 생기지 않음
        JsonNode err = json(mvc.perform(post("/api/cost-sheets?submit=true").header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(sheetBody(defaultItems(writer), List.of()))))
                .andExpect(status().isBadRequest()));
        assertThat(err.get("message").asText()).isEqualTo("결재선을 지정하세요.");
        // 품목 없이 저장+상신 → 400, 문서가 생기지 않음
        mvc.perform(post("/api/cost-sheets?submit=true").header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(sheetBody(List.of(), List.of(userId(writer, "leader"))))))
                .andExpect(status().isBadRequest());
        assertThat(json(mvc.perform(get("/api/cost-sheets?scope=mine").header("Authorization", writer))).size())
                .isEqualTo(before);

        // 조건을 갖추면 바로 결재중
        mvc.perform(post("/api/cost-sheets?submit=true").header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(sheetBody(defaultItems(writer), List.of(userId(writer, "leader"))))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IN_APPROVAL"));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void 수정후_상신이_실패하면_수정내용도_저장되지_않는다() throws Exception {
        String writer = login("writer");
        long id = createSheet(writer, List.of(userId(writer, "leader")));
        Map<String, Object> changed = new HashMap<>(sheetBody(defaultItems(writer), List.of()));
        changed.put("title", "바뀐 제목");

        mvc.perform(put("/api/cost-sheets/" + id + "?submit=true").header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(changed)))
                .andExpect(status().isBadRequest());

        JsonNode sheet = json(mvc.perform(get("/api/cost-sheets/" + id).header("Authorization", writer)));
        assertThat(sheet.get("title").asText()).isEqualTo("테스트 원가");
        assertThat(sheet.get("status").asText()).isEqualTo("DRAFT");
        assertThat(sheet.get("steps").size()).isEqualTo(1);
    }

    @Test
    void 상신부터_최종승인까지() throws Exception {
        String writer = login("writer");
        String leader = login("leader");
        String plant = login("plant");
        long id = createSheet(writer, List.of(userId(writer, "leader"), userId(writer, "plant")));

        act(writer, id, "submit", null).andExpect(jsonPath("$.status").value("IN_APPROVAL"));

        // 순서가 아닌 결재자는 승인 불가
        act(plant, id, "approve", null).andExpect(status().isForbidden());

        // 팀장 결재함에 들어와 있다
        JsonNode inbox = json(mvc.perform(get("/api/approvals").header("Authorization", leader)));
        assertThat(inbox.findValuesAsText("id")).contains(String.valueOf(id));

        act(leader, id, "approve", "확인").andExpect(jsonPath("$.status").value("IN_APPROVAL"))
                .andExpect(jsonPath("$.steps[0].status").value("APPROVED"))
                .andExpect(jsonPath("$.steps[1].status").value("PENDING"));

        // 한 명이라도 승인하면 회수 불가
        act(writer, id, "withdraw", null).andExpect(status().isBadRequest());

        act(plant, id, "approve", null).andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.histories.length()").value(3));

        // 승인완료 문서는 수정 불가
        mvc.perform(put("/api/cost-sheets/" + id).header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(sheetBody(defaultItems(writer), List.of(userId(writer, "leader"))))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 반려하면_수정후_재상신할_수_있다() throws Exception {
        String writer = login("writer");
        String leader = login("leader");
        long id = createSheet(writer, List.of(userId(writer, "leader")));
        act(writer, id, "submit", null);

        // 반려 사유 필수
        act(leader, id, "reject", "").andExpect(status().isBadRequest());
        act(leader, id, "reject", "노무비 근거 첨부 바랍니다.")
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.permissions.canApprove").value(false));

        mvc.perform(put("/api/cost-sheets/" + id).header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(sheetBody(defaultItems(writer), List.of(userId(writer, "leader"))))))
                .andExpect(status().isOk());
        act(writer, id, "submit", null).andExpect(jsonPath("$.status").value("IN_APPROVAL"))
                .andExpect(jsonPath("$.steps[0].status").value("PENDING"));

        // 처리한 결재함에 남아있다
        JsonNode done = json(mvc.perform(get("/api/approvals?box=done").header("Authorization", leader)));
        assertThat(done.findValuesAsText("id")).contains(String.valueOf(id));
    }

    @Test
    void 작성자는_결재선에_들어갈_수_없다() throws Exception {
        String writer = login("writer");
        Map<String, Object> body = sheetBody(defaultItems(writer), List.of(userId(writer, "writer")));
        mvc.perform(post("/api/cost-sheets").header("Authorization", writer)
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 결재권자는_기준정보를_수정할_수_없다() throws Exception {
        String leader = login("leader");
        mvc.perform(post("/api/products").header("Authorization", leader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"테스트\",\"specWeight\":100,\"specCount\":1,\"salePrice\":1000}"))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------- helpers

    private String login(String username) throws Exception {
        JsonNode res = json(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("username", username, "password", "1234"))))
                .andExpect(status().isOk()));
        return "Bearer " + res.get("token").asText();
    }

    private long createSheet(String token, List<Long> approverIds) throws Exception {
        JsonNode res = json(mvc.perform(post("/api/cost-sheets").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(sheetBody(defaultItems(token), approverIds))))
                .andExpect(status().isCreated()));
        return res.get("id").asLong();
    }

    private ResultActions act(String token, long id, String action, String comment) throws Exception {
        var req = post("/api/cost-sheets/" + id + "/" + action).header("Authorization", token);
        if (comment != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(Map.of("comment", comment)));
        }
        return mvc.perform(req);
    }

    private Map<String, Object> sheetBody(List<Map<String, Object>> items, List<Long> approverIds) throws Exception {
        return Map.of("title", "테스트 원가", "productId", 1, "productionQty", 100, "rawLossRate", 0, "salePrice", 2500,
                "laborCost", 50000, "overheadCost", 20000, "items", items, "approverIds", approverIds);
    }

    private List<Map<String, Object>> defaultItems(String token) throws Exception {
        return List.of(Map.of("materialId", materialId(token, "M-0001"), "ratio", 100));
    }

    private long materialId(String token, String code) throws Exception {
        JsonNode list = json(mvc.perform(get("/api/materials").header("Authorization", token)));
        for (JsonNode n : list) {
            if (n.get("code").asText().equals(code)) return n.get("id").asLong();
        }
        throw new IllegalStateException(code);
    }

    private long userId(String token, String username) throws Exception {
        if (username.equals("writer")) {
            return json(mvc.perform(get("/api/auth/me").header("Authorization", token))).get("id").asLong();
        }
        JsonNode list = json(mvc.perform(get("/api/users/approvers").header("Authorization", token)));
        for (JsonNode n : list) {
            if (n.get("username").asText().equals(username)) return n.get("id").asLong();
        }
        throw new IllegalStateException(username);
    }

    private JsonNode json(ResultActions result) throws Exception {
        return om.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
