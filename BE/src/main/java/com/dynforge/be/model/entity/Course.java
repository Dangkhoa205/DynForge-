package com.dynforge.be.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Course {

    private String code;
    private String name;
    /** "A" or "A+" — kept as a plain string since "A+" is not a valid Java enum identifier. */
    private String grade;
    private long ratePrivate;
    private long rateGroup;
    /**
     * General-education course (e.g. Calculus, Philosophy, General Physics).
     * Mentors from other universities may still teach these, so from phase 2
     * such courses are NOT filtered out by university.
     */
    @Builder.Default
    private boolean generalEducation = false;
}
