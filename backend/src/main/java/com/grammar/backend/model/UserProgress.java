package com.grammar.backend.model;

import java.time.Instant;
import java.util.List;
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

  private String grammarRule;

  private int score;

  private int totalQuestions;

  private Instant completedAt;

  private List<QuestionMistake> mistakes;

  @Data
  public static class QuestionMistake {
    private int questionOrder;
    private String question;
    private String selectedAnswer;
    private String correctAnswer;
    private String explanation;
  }
}
