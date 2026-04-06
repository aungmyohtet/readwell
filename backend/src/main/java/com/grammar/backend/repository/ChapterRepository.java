package com.grammar.backend.repository;

import com.grammar.backend.model.Chapter;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChapterRepository extends MongoRepository<Chapter, String> {
  List<Chapter> findByStoryIdOrderByChapterNumberAsc(String storyId);

  Optional<Chapter> findByStoryIdAndChapterNumber(String storyId, int chapterNumber);
}
