package com.grammar.backend.repository;

import com.grammar.backend.model.UserProgress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserProgressRepository extends MongoRepository<UserProgress, String> {
  List<UserProgress> findByUserIdOrderByCompletedAtDesc(String userId);

  List<UserProgress> findByUserIdAndStoryId(String userId, String storyId);

  Optional<UserProgress> findByUserIdAndChapterId(String userId, String chapterId);
}
