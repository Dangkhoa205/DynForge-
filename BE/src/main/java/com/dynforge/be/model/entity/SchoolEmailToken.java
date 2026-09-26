package com.dynforge.be.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;

/**
 * One-time code for verifying ownership of a school email address.
 * Mirrors {@link PasswordResetToken} but is scoped to a user + university.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("school_email_tokens")
public class SchoolEmailToken {

    @Id
    private String id;

    @Indexed
    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId userId;

    /** The university the email domain resolved to. */
    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId universityId;

    /** The school email being verified. */
    private String email;

    /** 6-digit one-time code. */
    private String otp;

    @Builder.Default
    private boolean verified = false;

    private Instant expiresAt;

    private Instant createdAt;
}
