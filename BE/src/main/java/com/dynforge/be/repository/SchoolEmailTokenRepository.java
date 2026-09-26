package com.dynforge.be.repository;

import com.dynforge.be.model.entity.SchoolEmailToken;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface SchoolEmailTokenRepository extends MongoRepository<SchoolEmailToken, String> {

    Optional<SchoolEmailToken> findByUserId(ObjectId userId);

    void deleteByUserId(ObjectId userId);
}
