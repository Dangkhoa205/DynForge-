package com.dynforge.be.controller;

import com.dynforge.be.model.dto.ApiResponse;
import com.dynforge.be.model.dto.BookingRequest;
import com.dynforge.be.model.dto.BookingResponse;
import com.dynforge.be.model.dto.DisputeRequest;
import com.dynforge.be.model.dto.MentorEarningsResponse;
import com.dynforge.be.model.dto.ResolveRequest;
import com.dynforge.be.model.dto.TopUpResponse;
import com.dynforge.be.security.UserPrincipal;
import com.dynforge.be.service.BookingService;
import com.dynforge.be.service.EscrowService;
import com.dynforge.be.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final EscrowService escrowService;
    private final WalletService walletService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BookingResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BookingRequest request
    ) {
        return ApiResponse.ok("Booking created", bookingService.create(principal.getUser(), request));
    }

    @GetMapping("/mine")
    public ApiResponse<List<BookingResponse>> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(bookingService.listMine(principal.getUser()));
    }

    @GetMapping("/mentor")
    public ApiResponse<List<BookingResponse>> mentorSchedule(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(bookingService.listMentorSchedule(principal.getUser()));
    }

    @GetMapping("/earnings")
    public ApiResponse<MentorEarningsResponse> earnings(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(bookingService.getMentorEarnings(principal.getUser()));
    }

    @GetMapping("/{id}")
    public ApiResponse<BookingResponse> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        return ApiResponse.ok(bookingService.getById(principal.getUser(), id));
    }

    @PostMapping("/{id}/pay")
    public ApiResponse<BookingResponse> pay(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        return ApiResponse.ok("Payment held in escrow", escrowService.pay(principal.getUser(), id));
    }

    /**
     * Pay for this one session through PayOS (exact price). Used by the Android app, which does not
     * offer wallet top-ups. {@code app=true} makes PayOS send the buyer back into the app.
     */
    @PostMapping("/{id}/checkout")
    public ApiResponse<TopUpResponse> checkout(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean app
    ) {
        return ApiResponse.ok("Checkout created", walletService.createBookingCheckout(principal.getUser(), id, app));
    }

    @PatchMapping("/{id}/cancel")
    public ApiResponse<BookingResponse> cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        return ApiResponse.ok("Booking cancelled", bookingService.cancel(principal.getUser(), id));
    }

    @PatchMapping("/{id}/accept")
    public ApiResponse<BookingResponse> accept(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        return ApiResponse.ok("Booking accepted", escrowService.accept(principal.getUser(), id));
    }

    @PatchMapping("/{id}/decline")
    public ApiResponse<BookingResponse> decline(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        return ApiResponse.ok("Booking declined and refunded", escrowService.decline(principal.getUser(), id));
    }

    @PatchMapping("/{id}/mark-taught")
    public ApiResponse<BookingResponse> markTaught(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        return ApiResponse.ok("Session marked as taught", escrowService.markTaught(principal.getUser(), id));
    }

    @PatchMapping("/{id}/confirm")
    public ApiResponse<BookingResponse> confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        return ApiResponse.ok("Booking confirmed and payment released", escrowService.confirmAndRelease(principal.getUser(), id));
    }

    @PatchMapping("/{id}/dispute")
    public ApiResponse<BookingResponse> dispute(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody DisputeRequest request
    ) {
        return ApiResponse.ok("Dispute opened",
                escrowService.dispute(principal.getUser(), id, request.issueType(), request.reason()));
    }

    @PatchMapping("/{id}/resolve")
    public ApiResponse<BookingResponse> resolve(
            @PathVariable String id,
            @Valid @RequestBody ResolveRequest request
    ) {
        return ApiResponse.ok("Dispute resolved", escrowService.resolveDispute(id, request.releaseToMentor()));
    }
}
