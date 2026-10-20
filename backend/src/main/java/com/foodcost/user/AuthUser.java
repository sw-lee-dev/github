package com.foodcost.user;

/**
 * JWT에서 꺼낸 로그인 사용자 정보. 컨트롤러에서 @AuthenticationPrincipal 로 받는다.
 */
public record AuthUser(Long id, String username, String name, Role role) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
