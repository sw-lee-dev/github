package com.foodcost.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * React Router 경로로 바로 접속하거나 새로고침해도 index.html 을 내려주도록 포워딩한다.
 */
@Controller
public class SpaForwardController {

    @GetMapping({"/login", "/approvals", "/materials", "/products", "/cost-sheets/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
