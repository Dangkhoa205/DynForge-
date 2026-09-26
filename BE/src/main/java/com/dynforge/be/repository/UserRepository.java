package com.dynforge.be.repository;

import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.Role;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findBySchoolEmail(String schoolEmail);

    boolean existsByEmail(String email);

    List<User> findByRolesContaining(Role role);

    long countByRolesContaining(Role role);

    List<User> findByUniversityIdIsNull();
}
