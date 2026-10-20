package com.foodcost.master;

import com.foodcost.common.ApiException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CodeSequenceTest {

    @Test
    void 기존_코드가_없으면_0001() {
        assertThat(CodeSequence.next("M", List.of())).isEqualTo("M-0001");
        assertThat(CodeSequence.next("FG", List.of())).isEqualTo("FG-0001");
    }

    @Test
    void 가장_큰_순번_다음으로_채번() {
        assertThat(CodeSequence.next("M", List.of("M-0001", "M-0007", "M-0003"))).isEqualTo("M-0008");
    }

    @Test
    void 다른_접두어나_형식이_다른_코드는_무시() {
        assertThat(CodeSequence.next("P", List.of("M-0009", "P-0002", "P-ABC", "PX-0050"))).isEqualTo("P-0003");
    }

    @Test
    void 최대_순번_초과시_오류() {
        assertThatThrownBy(() -> CodeSequence.next("M", List.of("M-9999"))).isInstanceOf(ApiException.class);
    }
}
