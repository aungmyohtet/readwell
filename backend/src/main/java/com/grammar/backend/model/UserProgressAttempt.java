package com.grammar.backend.model;

import java.time.Instant;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "user_progress_attempts")
public class UserProgressAttempt {

  @Id private String id;

  private String userId;

  private String storyId;

  private String chapterId;

  private String grammarRule;

  private int score;

  private int totalQuestions;

  private Instant completedAt;

  private List<ProgressQuestionMistake> mistakes;
}