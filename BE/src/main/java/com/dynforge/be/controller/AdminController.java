package com.dynforge.be.controller;

import com.dynforge.be.model.dto.AdminDashboardResponse;
import com.dynforge.be.model.dto.AdminDisputeResponse;
import com.dynforge.be.model.dto.AdminTransactionResponse;
import com.dynforge.be.model.dto.ApiResponse;
import com.dynforge.be.model.dto.BookingResponse;
import com.dynforge.be.model.dto.CommissionReportResponse;
import com.dynforge.be.model.dto.MentorProfileResponse;
import com.dynforge.be.model.dto.RecordingResponse;
import com.dynforge.be.model.dto.UpdateUserStatusRequest;
import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.TransactionType;
import com.dynforge.be.service.AdminService;
import com.dynforge.be.service.MentorService;
import com.dynforge.be.service.RecordingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final MentorService mentorService;
    private final RecordingService recordingService;

    @GetMapping("/dashboard")
    public ApiResponse<AdminDashboardResponse> dashboard() {
        return ApiResponse.ok(adminService.getDashboard());
    }

    @GetMapping("/users")
    public ApiResponse<List<UserResponse>> users(@RequestParam(required = false) Role role) {
        return ApiResponse.ok(adminService.listUsers(role));
    }

    @PatchMapping("/users/{id}/status")
    public ApiResponse<UserResponse> updateUserStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return ApiResponse.ok("User status updated", adminService.updateUserStatus(id, request.status()));
    }

    @GetMapping("/transactions")
    public ApiResponse<List<AdminTransactionResponse>> transactions(
            @RequestParam(required = false) TransactionType type
    ) {
        return ApiResponse.ok(adminService.listTransactions(type));
    }

    @GetMapping("/commission")
    public ApiResponse<CommissionReportResponse> commission() {
        return ApiResponse.ok(adminService.getCommissionReport());
    }

    @GetMapping("/disputes")
    public ApiResponse<List<AdminDisputeResponse>> disputes() {
        return ApiResponse.ok(adminService.listDisputes());
    }

    @GetMapping("/recordings")
    public ApiResponse<List<RecordingResponse>> recordings() {
        return ApiResponse.ok(recordingService.listAll());
    }

    @GetMapping("/mentors")
    public ApiResponse<List<MentorProfileResponse>> mentors() {
        return ApiResponse.ok(mentorService.listAllMentors());
    }

    @GetMapping("/mentors/{mentorUserId}/bookings")
    public ApiResponse<List<BookingResponse>> mentorBookings(@PathVariable String mentorUserId) {
        return ApiResponse.ok(adminService.getMentorBookings(mentorUserId));
    }
}
