package com.dynforge.be.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record VerificationRequestDto(
        @NotBlank String course,
        @NotBlank @Pattern(regexp = "A|A\\+", message = "claimedGrade must be \"A\" or \"A+\"") String claimedGrade,
        String transcriptUrl,
        String alumniProofUrl,
        /** All uploaded documents: "category|doc:<fileId>:<fileName>". Optional. */
        @Size(max = 20) List<String> documents
) {
    public VerificationRequestDto(String course, String claimedGrade, String transcriptUrl) {
        this(course, claimedGrade, transcriptUrl, null, null);
    }

    public VerificationRequestDto(String course, String claimedGrade, String transcriptUrl, String alumniProofUrl) {
        this(course, claimedGrade, transcriptUrl, alumniProofUrl, null);
    }
}
