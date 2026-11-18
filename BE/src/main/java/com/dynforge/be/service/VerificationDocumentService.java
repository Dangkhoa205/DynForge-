package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.Role;
import com.mongodb.client.gridfs.model.GridFSFile;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;

/**
 * Stores the files a mentor attaches to a verification request (transcript, student card,
 * certificates) and serves them back to the owner and to admins.
 *
 * <p>A stored file is referenced from {@code VerificationRequest.transcriptUrl / alumniProofUrl} as
 * {@code doc:<fileId>:<fileName>} (no "/" so it passes the existing document-proof validation).
 */
@Service
@RequiredArgsConstructor
public class VerificationDocumentService {

    public static final String REF_PREFIX = "doc:";
    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif");

    private final GridFsTemplate documentGridFsTemplate;

    public record StoredDocument(String id, String fileName, String contentType, long size, String ref) { }

    public record LoadedDocument(String fileName, String contentType, GridFsResource resource) { }

    public StoredDocument store(User owner, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Tệp tải lên đang trống.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Tệp quá lớn (tối đa 10 MB).");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("Chỉ nhận tệp PDF hoặc ảnh (JPG, PNG, WEBP, HEIC).");
        }
        String fileName = sanitize(file.getOriginalFilename());

        Document metadata = new Document()
                .append("ownerId", owner.getId())
                .append("originalName", fileName)
                .append("uploadedAt", Instant.now().toString());
        try {
            ObjectId id = documentGridFsTemplate.store(file.getInputStream(), fileName, contentType, metadata);
            return new StoredDocument(id.toHexString(), fileName, contentType, file.getSize(),
                    REF_PREFIX + id.toHexString() + ":" + fileName);
        } catch (IOException e) {
            throw new BadRequestException("Không lưu được tệp, vui lòng thử lại.");
        }
    }

    /** Owner of the file or an admin only. */
    public LoadedDocument load(User requester, String id) {
        if (!ObjectId.isValid(id)) {
            throw new ResourceNotFoundException("Document not found: " + id);
        }
        GridFSFile file = documentGridFsTemplate.findOne(Query.query(Criteria.where("_id").is(new ObjectId(id))));
        if (file == null) {
            throw new ResourceNotFoundException("Document not found: " + id);
        }
        Document metadata = file.getMetadata();
        String ownerId = metadata == null ? null : metadata.getString("ownerId");
        boolean isAdmin = requester.getRoles() != null && requester.getRoles().contains(Role.ADMIN);
        if (!isAdmin && (ownerId == null || !ownerId.equals(requester.getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot view this document");
        }
        GridFsResource resource = documentGridFsTemplate.getResource(file);
        String contentType = metadata != null && metadata.getString("_contentType") != null
                ? metadata.getString("_contentType")
                : resource.getContentType();
        return new LoadedDocument(file.getFilename(), contentType, resource);
    }

    private static String sanitize(String name) {
        String n = (name == null || name.isBlank()) ? "tai-lieu" : name;
        n = n.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").replace("..", "_").trim();
        return n.length() > 120 ? n.substring(n.length() - 120) : n;
    }
}
