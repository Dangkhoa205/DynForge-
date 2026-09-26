package com.dynforge.be.repository;

import com.dynforge.be.model.entity.MentorProfile;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MentorRepositoryCustom {

    /**
     * Paginated mentor search. All filters are optional (null/blank = ignore).
     * <p>University rule: when {@code universityId} is provided, a mentor matches
     * if it belongs to that university OR it teaches at least one general-education
     * course ({@code courses.generalEducation == true}). When {@code universityId}
     * is null, mentors from all universities are returned.
     */
    Page<MentorProfile> search(ObjectId universityId,
                               String major,
                               String courseCode,
                               String format,
                               Boolean verified,
                               Pageable pageable);
}
