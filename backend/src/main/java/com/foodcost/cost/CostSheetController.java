package com.foodcost.cost;

import com.foodcost.cost.CostSheetDto.*;
import com.foodcost.user.AuthUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cost-sheets")
@RequiredArgsConstructor
public class CostSheetController {

    private final CostSheetService costSheetService;

    @GetMapping
    public List<Summary> search(@AuthenticationPrincipal AuthUser user,
                                @RequestParam(defaultValue = "mine") String scope,
                                @RequestParam(required = false) CostStatus status) {
        return costSheetService.search(user, scope, status);
    }

    @GetMapping("/{id}")
    public Detail get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return costSheetService.get(user, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Detail create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody SaveRequest request) {
        return costSheetService.create(user, request);
    }

    @PutMapping("/{id}")
    public Detail update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                         @Valid @RequestBody SaveRequest request) {
        return costSheetService.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        costSheetService.delete(user, id);
    }

    @PostMapping("/{id}/submit")
    public Detail submit(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return costSheetService.submit(user, id);
    }

    @PostMapping("/{id}/withdraw")
    public Detail withdraw(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return costSheetService.withdraw(user, id);
    }

    @PostMapping("/{id}/approve")
    public Detail approve(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                          @Valid @RequestBody(required = false) CommentRequest request) {
        return costSheetService.approve(user, id, request == null ? null : request.comment());
    }

    @PostMapping("/{id}/reject")
    public Detail reject(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                         @Valid @RequestBody CommentRequest request) {
        return costSheetService.reject(user, id, request.comment());
    }
}
