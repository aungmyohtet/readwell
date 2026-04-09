package com.grammar.backend.repository;

import com.grammar.backend.model.PlacementProfile;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlacementProfileRepository extends MongoRepository<PlacementProfile, String> {
  Optional<PlacementProfile> findByUserId(String userId);
}