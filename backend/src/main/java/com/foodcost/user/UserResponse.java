package com.foodcost.user;

public record UserResponse(
        Long id,
        String username,
        String name,
        String department,
        String position,
        Role role,
        String roleLabel
) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getName(),
                user.getDepartment(), user.getPosition(), user.getRole(), user.getRole().getLabel());
    }
}
