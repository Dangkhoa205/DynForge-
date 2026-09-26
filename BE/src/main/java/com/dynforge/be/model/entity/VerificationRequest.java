package com.dynforge.be.model.entity;

import com.dynforge.be.model.enums.VerificationStatus;
import com.dynforge.be.model.enums.VerificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("verification_requests")
public class VerificationRequest {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId userId;

    /** Copied from the user at submit time. */
    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId universityId;

    private String course;

    /** "A" or "A+". */
    private String claimedGrade;

    private String transcriptUrl;

    /** What kind of request this is; defaults to the original transcript flow. */
    @Builder.Default
    private VerificationType type = VerificationType.COURSE_GRADE;

    /**
     * TODO(phase 2 alumni flow): URL of alumni proof (degree / alumni card) for
     * {@link VerificationType#ALUMNI} requests submitted by graduates who no
     * longer have a working school email. An admin reviews and approves these
     * manually from the existing AdminVerification screen — no automated
     * email-domain check applies.
     */
    private String alumniProofUrl;

    @Builder.Default
    private VerificationStatus status = VerificationStatus.PENDING;

    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId reviewedBy;

    private Instant reviewedAt;

    private String note;

    private Instant createdAt;
}
