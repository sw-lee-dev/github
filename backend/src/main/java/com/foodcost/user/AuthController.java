package com.foodcost.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request.username(), request.password());
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthUser authUser) {
        return authService.me(authUser.id());
    }

    public record LoginRequest(
            @NotBlank(message = "아이디를 입력하세요.") String username,
            @NotBlank(message = "비밀번호를 입력하세요.") String password
    ) {
    }

    public record LoginResponse(String token, UserResponse user) {
    }
}
