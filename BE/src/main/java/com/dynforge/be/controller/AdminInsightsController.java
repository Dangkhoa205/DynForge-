package com.dynforge.be.controller;

import com.dynforge.be.model.dto.ApiResponse;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.service.AdminInsightsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin analytics. Protected by SecurityConfig: /api/admin/** requires ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/insights")
@RequiredArgsConstructor
public class AdminInsightsController {

    private final AdminInsightsService insightsService;

    /** User demographics: age groups, majors, universities, provinces. role = MENTEE | MENTOR (optional). */
    @GetMapping("/demographics")
    public ApiResponse<AdminInsightsService.Demographics> demographics(@RequestParam(required = false) Role role) {
        return ApiResponse.ok(insightsService.demographics(role));
    }

    /** All reviews left after sessions, newest first, plus per-mentor averages. */
    @GetMapping("/feedback")
    public ApiResponse<AdminInsightsService.Feedback> feedback() {
        return ApiResponse.ok(insightsService.feedback());
    }
}
