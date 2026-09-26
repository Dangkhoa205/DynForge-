package com.dynforge.be.controller;

import com.dynforge.be.model.dto.ApiResponse;
import com.dynforge.be.model.dto.MentorProfileRequest;
import com.dynforge.be.model.dto.MentorProfileResponse;
import com.dynforge.be.model.dto.PageResponse;
import com.dynforge.be.security.UserPrincipal;
import com.dynforge.be.service.MentorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mentors")
@RequiredArgsConstructor
public class MentorController {

    private final MentorService mentorService;

    @GetMapping
    public ApiResponse<List<MentorProfileResponse>> list(
            @RequestParam(required = false) String course,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) Boolean verified
    ) {
        return ApiResponse.ok(mentorService.listMentors(course, format, verified));
    }

    // NOTE: declared before "/{id}" so "search" is not captured as a path variable.
    @GetMapping("/search")
    public ApiResponse<PageResponse<MentorProfileResponse>> search(
            @RequestParam(required = false) String university,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String course,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) Boolean verified,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(mentorService.searchMentors(university, major, course, format, verified, page, size));
    }

    @GetMapping("/me")
    public ApiResponse<MentorProfileResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(mentorService.getOwnProfile(principal.getUser()));
    }

    @PutMapping("/me")
    public ApiResponse<MentorProfileResponse> updateMe(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody MentorProfileRequest request
    ) {
        return ApiResponse.ok("Profile updated", mentorService.upsertOwnProfile(principal.getUser(), request));
    }

    @GetMapping("/{id}")
    public ApiResponse<MentorProfileResponse> getById(@PathVariable String id) {
        return ApiResponse.ok(mentorService.getById(id));
    }
}
