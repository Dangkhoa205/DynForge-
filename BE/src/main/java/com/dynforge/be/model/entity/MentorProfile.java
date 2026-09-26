package com.dynforge.be.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("mentor_profiles")
@CompoundIndex(name = "uni_verified_major_idx",
               def = "{'universityId': 1, 'verified': 1, 'major': 1}")
public class MentorProfile {

    @Id
    private String id;

    @Indexed(unique = true)
    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId userId;

    private String title;

    private String bio;

    /** Academic major (matches the mentee search filter options). */
    private String major;

    /** The university this mentor belongs to (reference to University.id). */
    @Field(targetType = FieldType.OBJECT_ID)
    private ObjectId universityId;

    /**
     * Fast-read denormalized copy of {@link University#getName()}.
     * Kept as free text so the existing frontend does not break; the source of
     * truth is {@link #universityId}.
     */
    private String university;

    /** e.g. "Senior Student", "Alumni Mentor", "Lecturer", "Research Advisor". */
    private String teachingRole;

    private List<Course> courses;

    private List<String> skills;

    private List<String> languages;

    private Map<String, List<String>> availability;

    @Builder.Default
    private List<String> formats = List.of("Online", "Offline");

    @Builder.Default
    private boolean verified = false;

    @Builder.Default
    private double ratingAvg = 0;

    @Builder.Default
    private int ratingCount = 0;

    @Builder.Default
    private int sessionsCount = 0;
}
