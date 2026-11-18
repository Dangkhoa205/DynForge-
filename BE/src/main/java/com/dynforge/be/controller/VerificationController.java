package com.dynforge.be.controller;

import com.dynforge.be.model.dto.ApiResponse;
import com.dynforge.be.model.dto.VerificationDecisionRequest;
import com.dynforge.be.model.dto.VerificationRequestDto;
import com.dynforge.be.model.dto.VerificationResponse;
import com.dynforge.be.model.enums.VerificationStatus;
import com.dynforge.be.security.UserPrincipal;
import com.dynforge.be.service.VerificationDocumentService;
import com.dynforge.be.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/verifications")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;
    private final VerificationDocumentService documentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VerificationResponse> submit(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody VerificationRequestDto dto
    ) {
        return ApiResponse.ok("Verification request submitted", verificationService.submit(principal.getUser(), dto));
    }

    @GetMapping("/mine")
    public ApiResponse<List<VerificationResponse>> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(verificationService.getMine(principal.getUser()));
    }

    @GetMapping
    public ApiResponse<List<VerificationResponse>> list(@RequestParam(required = false) VerificationStatus status) {
        return ApiResponse.ok(verificationService.list(status));
    }

    @PostMapping("/{id}/decision")
    public ApiResponse<VerificationResponse> decide(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody VerificationDecisionRequest decision
    ) {
        return ApiResponse.ok("Decision recorded", verificationService.decide(principal.getUser(), id, decision));
    }

    /** Upload one verification document (PDF/image, max 10 MB). Returns the reference to put in transcriptUrl/alumniProofUrl. */
    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VerificationDocumentService.StoredDocument> uploadDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        return ApiResponse.ok("Document uploaded", documentService.store(principal.getUser(), file));
    }

    /** View a verification document — the mentor who uploaded it or an admin. */
    @GetMapping("/documents/{id}")
    public ResponseEntity<Resource> getDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        VerificationDocumentService.LoadedDocument doc = documentService.load(principal.getUser(), id);
        MediaType type;
        try {
            type = MediaType.parseMediaType(doc.contentType() == null ? "application/octet-stream" : doc.contentType());
        } catch (Exception e) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(doc.fileName() == null ? "tai-lieu" : doc.fileName(), StandardCharsets.UTF_8)
                        .build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(doc.resource());
    }
}
