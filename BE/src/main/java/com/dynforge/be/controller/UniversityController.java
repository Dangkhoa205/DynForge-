package com.dynforge.be.controller;

import com.dynforge.be.model.dto.ApiResponse;
import com.dynforge.be.model.dto.UniversityResponse;
import com.dynforge.be.service.UniversityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/universities")
@RequiredArgsConstructor
public class UniversityController {

    private final UniversityService universityService;

    @GetMapping
    public ApiResponse<List<UniversityResponse>> list() {
        return ApiResponse.ok(universityService.listPublic());
    }

    @GetMapping("/{code}")
    public ApiResponse<UniversityResponse> getByCode(@PathVariable String code) {
        return ApiResponse.ok(universityService.getByCode(code));
    }
}
