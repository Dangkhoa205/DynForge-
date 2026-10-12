package com.dynforge.be.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SchoolEmailRequest(
        @NotBlank @Email String email,
        /** University picked in the mentor form; used when the email domain is not a known school domain. */
        String universityCode
) {
}
