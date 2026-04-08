package com.grammar.backend.repository;

import com.grammar.backend.model.UserProgressAttempt;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserProgressAttemptRepository extends MongoRepository<UserProgressAttempt, String> {
  List<UserProgressAttempt> findByUserIdAndChapterIdOrderByCompletedAtDesc(String userId, String chapterId);
}