package com.foodcost.user;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /** 결재선 지정 시 선택할 수 있는 결재권자 목록 */
    @GetMapping("/approvers")
    @Transactional(readOnly = true)
    public List<UserResponse> approvers() {
        return userRepository.findByRoleInOrderByIdAsc(List.of(Role.APPROVER, Role.ADMIN)).stream()
                .map(UserResponse::from)
                .toList();
    }
}
