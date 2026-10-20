package com.foodcost.user;

import com.foodcost.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 50)
    private String department;

    @Column(length = 50)
    private String position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Builder
    private User(String username, String password, String name, String department, String position, Role role) {
        this.username = username;
        this.password = password;
        this.name = name;
        this.department = department;
        this.position = position;
        this.role = role;
    }

    public boolean canApprove() {
        return role == Role.APPROVER || role == Role.ADMIN;
    }

    /** 결재선 등에 표시할 이름. 예) 이현수 팀장 */
    public String getDisplayName() {
        return position == null ? name : name + " " + position;
    }
}
