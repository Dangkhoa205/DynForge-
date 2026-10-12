package com.dynforge.be.model.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * @param confirmEmail the user must type their own email address to confirm the deletion
 */
public record DeleteAccountRequest(
        @NotBlank String confirmEmail
) {
}
