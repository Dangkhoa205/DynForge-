package com.dynforge.be.model.enums;

/** Kind of mentor verification request (drives how admin reviews it). */
public enum VerificationType {
    /** Course + grade proof via transcript (the original flow). */
    COURSE_GRADE,
    /**
     * Alumni without an active school email: they upload proof (degree, alumni card)
     * and an admin approves manually from the existing AdminVerification screen.
     */
    ALUMNI
}
