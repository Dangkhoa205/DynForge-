package com.dynforge.be.controller;

import com.dynforge.be.mapper.UserMapper;
import com.dynforge.be.model.dto.ApiResponse;
import com.dynforge.be.model.dto.ChangePasswordRequest;
import com.dynforge.be.model.dto.SchoolEmailRequest;
import com.dynforge.be.model.dto.SchoolEmailVerifyRequest;
import com.dynforge.be.model.dto.UpdateProfileRequest;
import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.security.UserPrincipal;
import com.dynforge.be.service.SchoolEmailService;
import com.dynforge.be.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserMapper userMapper;
    private final UserService userService;
    private final SchoolEmailService schoolEmailService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(userMapper.toResponse(principal.getUser()));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateMe(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ApiResponse.ok("Profile updated", userService.updateProfile(principal.getUser(), request));
    }

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(principal.getUser(), request);
    }

    /** Step 1: request an OTP to the given school email (domain must belong to a University). */
    @PostMapping("/me/school-email/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestSchoolEmail(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SchoolEmailRequest request
    ) {
        schoolEmailService.requestVerification(principal.getUser(), request.email());
    }

    /** Step 2: confirm the OTP; on success the user is marked schoolVerified. */
    @PostMapping("/me/school-email/verify")
    public ApiResponse<UserResponse> verifySchoolEmail(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SchoolEmailVerifyRequest request
    ) {
        schoolEmailService.confirmVerification(principal.getUser(), request.otp());
        return ApiResponse.ok("Đã xác minh email trường", userMapper.toResponse(principal.getUser()));
    }
}
