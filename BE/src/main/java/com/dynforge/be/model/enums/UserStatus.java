package com.dynforge.be.model.enums;

public enum UserStatus {
    ACTIVE,
    SUSPENDED,
    /** The user deleted their account; personal data was erased and the record anonymised. */
    DELETED
}
