package com.dynforge.be.repository;

import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.enums.UniversityStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UniversityRepository extends MongoRepository<University, String> {

    Optional<University> findByCode(String code);

    /** Matches a university whose emailDomains array contains the given (lowercase) domain. */
    Optional<University> findByEmailDomainsContaining(String domain);

    List<University> findByStatusIn(Collection<UniversityStatus> statuses);

    boolean existsByCode(String code);
}
