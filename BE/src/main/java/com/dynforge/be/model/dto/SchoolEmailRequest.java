package com.dynforge.be.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SchoolEmailRequest(
        @NotBlank @Email String email
) {
}
