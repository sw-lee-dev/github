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
import org.springframework.transaction.annotation.Transactional;

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
        // 박력분 100kg × 1,000원 × (1 + 10%) = 110,000 / 필름 1,000EA × 20원 = 20,000
        Map<String, Object> body = sheetBody(List.of(
                Map.of("materialId", materialId(writer, "M-001"), "quantity", 100, "unitPrice", 1000, "lossRate", 10),
                Map.of("materialId", materialId(writer, "P-001"), "quantity", 1000, "unitPrice", 20)
        ), List.of(userId(writer, "leader")));

        JsonNode sheet = json(mvc.perform(post("/api/cost-sheets").header("Authorization", writer)
                .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body)))
                .andExpect(status().isCreated()));

        // 총원가 = 110,000 + 20,000 + 노무비 50,000 + 경비 20,000 = 200,000 / 100개 = 2,000원, 판매가 2,500원 → 마진 20%
        assertThat(sheet.get("materialCost").decimalValue()).isEqualByComparingTo("110000");
        assertThat(sheet.get("packagingCost").decimalValue()).isEqualByComparingTo("20000");
        assertThat(sheet.get("totalCost").decimalValue()).isEqualByComparingTo("200000");
        assertThat(sheet.get("unitCost").decimalValue()).isEqualByComparingTo("2000");
        assertThat(sheet.get("marginRate").decimalValue()).isEqualByComparingTo("20");
        assertThat(sheet.get("status").asText()).isEqualTo("DRAFT");
        assertThat(sheet.get("docNo").asText()).startsWith("CS-");
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
                        .content("{\"code\":\"FG-999\",\"name\":\"테스트\",\"salePrice\":1000}"))
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
        return Map.of("title", "테스트 원가", "productId", 1, "productionQty", 100, "salePrice", 2500,
                "laborCost", 50000, "overheadCost", 20000, "items", items, "approverIds", approverIds);
    }

    private List<Map<String, Object>> defaultItems(String token) throws Exception {
        return List.of(Map.of("materialId", materialId(token, "M-001"), "quantity", 10));
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
        return om.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
