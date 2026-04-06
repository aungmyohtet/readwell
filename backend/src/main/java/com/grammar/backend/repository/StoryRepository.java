package com.grammar.backend.repository;

import com.grammar.backend.model.Story;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StoryRepository extends MongoRepository<Story, String> {
  List<Story> findByLevel(String level);

  List<Story> findByLevelIn(List<String> levels);
}
