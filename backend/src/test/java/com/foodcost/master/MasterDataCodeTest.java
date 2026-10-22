package com.foodcost.master;

import com.foodcost.master.MasterDto.MaterialRequest;
import com.foodcost.master.MasterDto.MaterialResponse;
import com.foodcost.master.MasterDto.ProductRequest;
import com.foodcost.master.MasterDto.ProductResponse;
import com.foodcost.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 샘플 데이터: 원재료 M-0001~M-0012, 포장재 P-0001~P-0005, 제품 FG-0001~FG-0003
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MasterDataCodeTest {

    @Autowired
    MasterDataService service;

    @Autowired
    MockMvc mvc;

    @Test
    void 샘플_데이터_코드가_4자리로_채번된다() {
        assertThat(service.materials()).extracting(MaterialResponse::code)
                .contains("M-0001", "M-0012", "P-0001", "P-0005")
                .allMatch(c -> c.matches("[MP]-\\d{4}"));
        assertThat(service.products()).extracting(ProductResponse::code)
                .containsExactly("FG-0001", "FG-0002", "FG-0003");
    }

    @Test
    void 제품코드는_다음_순번으로_자동_채번된다() {
        assertThat(service.createProduct(product("신제품A")).code()).isEqualTo("FG-0004");
        assertThat(service.createProduct(product("신제품B")).code()).isEqualTo("FG-0005");
    }

    @Test
    void 제품_수정으로_코드는_바뀌지_않는다() {
        ProductResponse created = service.createProduct(product("신제품"));
        ProductResponse updated = service.updateProduct(created.id(), new ProductRequest("이름변경", BigDecimal.valueOf(250), 4, true));
        assertThat(updated.code()).isEqualTo(created.code());
        assertThat(updated.name()).isEqualTo("이름변경");
        assertThat(updated.spec()).isEqualTo("250g × 4EA");
        assertThat(updated.unitWeight()).isEqualByComparingTo("1000");
    }

    @Test
    void 샘플_제품_판매가는_승인된_원가계산서가_있는_제품만_책정된다() {
        List<ProductResponse> products = service.products();
        assertThat(products.get(0).salePrice()).isEqualByComparingTo("4500");
        assertThat(products.get(1).salePrice()).isNull();
        assertThat(products.get(2).salePrice()).isNull();
    }

    @Test
    @WithMockUser(roles = "WRITER")
    void 제품_등록_수정으로는_판매가를_정할_수_없다() throws Exception {
        String body = "{\"name\":\"판매가무시\",\"specWeight\":10,\"specCount\":1,\"salePrice\":1000}";
        var res = mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.salePrice").isEmpty())
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        long id = new com.fasterxml.jackson.databind.ObjectMapper().readTree(res).get("id").asLong();
        // 승인으로 책정된 FG-0001 판매가(4500)도 수정 요청으로는 바뀌지 않는다
        mvc.perform(put("/api/products/1").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"버터쿠키\",\"specWeight\":20,\"specCount\":10,\"salePrice\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salePrice").value(4500));
        mvc.perform(put("/api/products/" + id).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(jsonPath("$.salePrice").isEmpty());
    }

    @Test
    void 규격은_g_x_EA_로_저장되고_제품_당_무게가_자동_계산된다() {
        ProductResponse p = service.createProduct(new ProductRequest("미니쿠키", BigDecimal.valueOf(25), 8, true));
        assertThat(p.spec()).isEqualTo("25g × 8EA");
        assertThat(p.specWeight()).isEqualByComparingTo("25");
        assertThat(p.specCount()).isEqualTo(8);
        assertThat(p.unitWeight()).isEqualByComparingTo("200");
        assertThat(service.products().get(0).spec()).isEqualTo("20g × 10EA");
    }

    @Test
    @WithMockUser(roles = "WRITER")
    void 규격_무게와_입수는_정수만_허용() throws Exception {
        String body = "{\"name\":\"소수무게\",\"specWeight\":12.5,\"specCount\":2}";
        var res = mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andReturn().getResponse();
        assertThat(res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8))
                .contains("규격의 무게(g)는 정수만 입력할 수 있습니다.");
        // 입수(EA)도 정수만: 소수를 잘라 저장하지 않고 거부
        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                        .content(body.replace("12.5", "12").replace("\"specCount\":2", "\"specCount\":2.5")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                        .content(body.replace("12.5", "12")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.spec").value("12g × 2EA"));
    }

    @Test
    void 자재_일괄등록시_구분별로_순번이_매겨진다() {
        List<MaterialResponse> created = service.createMaterials(List.of(
                material("옥수수전분", MaterialType.RAW),
                material("라벨스티커", MaterialType.PACKAGING),
                material("물엿", MaterialType.RAW)));
        assertThat(created).extracting(MaterialResponse::code).containsExactly("M-0013", "P-0006", "M-0014");
    }

    @Test
    void 자재_구분은_변경할_수_없다() {
        MaterialResponse m = service.createMaterial(material("코팅필름", MaterialType.PACKAGING));
        assertThatThrownBy(() -> service.updateMaterial(m.id(), material("코팅필름", MaterialType.RAW)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("구분은 변경할 수 없습니다");
    }

    @Test
    @WithMockUser(roles = "WRITER")
    void 일괄등록_API_요청에_코드를_보내도_무시되고_자동_채번된다() throws Exception {
        mvc.perform(post("/api/materials/batch").contentType(MediaType.APPLICATION_JSON).content("""
                        {"items":[
                          {"code":"X-9999","name":"찹쌀가루","type":"RAW","unit":"kg","unitPrice":3200},
                          {"name":"포장끈","type":"PACKAGING","unit":"EA","unitPrice":5}
                        ]}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].code").value("M-0013"))
                .andExpect(jsonPath("$[1].code").value("P-0006"));
    }

    @Test
    @WithMockUser(roles = "WRITER")
    void 일괄등록_항목이_비어있으면_400() throws Exception {
        mvc.perform(post("/api/materials/batch").contentType(MediaType.APPLICATION_JSON).content("{\"items\":[]}"))
                .andExpect(status().isBadRequest());
    }

    private static ProductRequest product(String name) {
        return new ProductRequest(name, BigDecimal.valueOf(100), 1, true);
    }

    private static MaterialRequest material(String name, MaterialType type) {
        return new MaterialRequest(name, type, "kg", BigDecimal.valueOf(1000), true);
    }
}
