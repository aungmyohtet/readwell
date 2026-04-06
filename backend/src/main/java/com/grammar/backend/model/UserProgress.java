package com.grammar.backend.model;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "user_progress")
@CompoundIndex(name = "user_chapter_idx", def = "{'userId': 1, 'chapterId': 1}", unique = true)
public class UserProgress {

  @Id private String id;

  private String userId;

  private String storyId;

  private String chapterId;

  private int score;

  private int totalQuestions;

  private Instant completedAt;
}
