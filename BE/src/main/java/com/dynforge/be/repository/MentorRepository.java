package com.dynforge.be.repository;

import com.dynforge.be.model.entity.MentorProfile;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MentorRepository extends MongoRepository<MentorProfile, String>, MentorRepositoryCustom {

    Optional<MentorProfile> findByUserId(ObjectId userId);

    List<MentorProfile> findByVerifiedTrue();

    List<MentorProfile> findByVerifiedTrueAndCourses_Code(String courseCode);

    List<MentorProfile> findByVerified(boolean verified);

    List<MentorProfile> findByVerifiedAndCourses_Code(boolean verified, String courseCode);

    List<MentorProfile> findByUniversityIdIsNull();

    long countByUniversityIdAndVerifiedTrue(ObjectId universityId);
}
