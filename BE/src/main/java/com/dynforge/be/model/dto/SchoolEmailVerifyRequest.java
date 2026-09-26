package com.dynforge.be.model.dto;

import jakarta.validation.constraints.NotBlank;

public record SchoolEmailVerifyRequest(
        @NotBlank String otp
) {
}
