package com.dynforge.be.repository;

import com.dynforge.be.model.entity.MentorProfile;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
public class MentorRepositoryImpl implements MentorRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    @Override
    public Page<MentorProfile> search(ObjectId universityId,
                                      String major,
                                      String courseCode,
                                      String format,
                                      Boolean verified,
                                      Pageable pageable) {
        List<Criteria> and = new ArrayList<>();

        if (verified != null) {
            and.add(Criteria.where("verified").is(verified));
        }
        if (major != null && !major.isBlank()) {
            and.add(Criteria.where("major").is(major));
        }
        if (courseCode != null && !courseCode.isBlank()) {
            and.add(Criteria.where("courses.code").is(courseCode));
        }
        if (format != null && !format.isBlank()) {
            and.add(Criteria.where("formats").is(format));
        }
        if (universityId != null) {
            // Belongs to this university OR teaches a cross-university general-education course.
            and.add(new Criteria().orOperator(
                    Criteria.where("universityId").is(universityId),
                    Criteria.where("courses.generalEducation").is(true)
            ));
        }

        Query query = new Query();
        if (!and.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(and.toArray(new Criteria[0])));
        }

        long total = mongoTemplate.count(query, MentorProfile.class);
        query.with(pageable);
        List<MentorProfile> items = mongoTemplate.find(query, MentorProfile.class);
        return new PageImpl<>(items, pageable, total);
    }
}
