package com.dynforge.be.repository;

import com.dynforge.be.model.entity.VerificationRequest;
import com.dynforge.be.model.enums.VerificationStatus;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VerificationRepository extends MongoRepository<VerificationRequest, String> {

    List<VerificationRequest> findByStatus(VerificationStatus status);

    List<VerificationRequest> findByUserId(ObjectId userId);

    List<VerificationRequest> findByUniversityIdIsNull();
}
