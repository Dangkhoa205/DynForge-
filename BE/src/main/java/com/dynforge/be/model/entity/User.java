package com.dynforge.be.model.entity;

import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.UserStatus;
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
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("users")
public class User {

    @Id
    private String id;

    private String fullName;

    @Indexed(unique = true)
    private String email;

    private String phone;

    private String passwordHash;

    private Set<Role> roles;

    private String studentId;

    private String major;

    /** The university this user belongs to (denormalized reference to University.id). */
    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId universityId;

    private String year;

    private String avatarUrl;

    /** Verified school email (unique across users once verified). */
    private String schoolEmail;

    /** True once the user has verified ownership of a {@link #schoolEmail}. */
    @Builder.Default
    private boolean schoolVerified = false;

    @Builder.Default
    private long walletBalance = 0;

    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    private Instant createdAt;
}
