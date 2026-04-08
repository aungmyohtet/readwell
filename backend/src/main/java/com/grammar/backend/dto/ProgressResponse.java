package com.grammar.backend.dto;

import java.time.Instant;
import lombok.Data;

@Data
public class ProgressResponse {
  private String id;
  private String userId;
  private String storyId;
  private String storyTitle;
  private String chapterId;
  private String chapterTitle;
  private int chapterNumber;
  private int score;
  private int bestScore;
  private Integer previousScore;
  private int attemptCount;
  private int totalQuestions;
  private Instant completedAt;
  private Instant nextReviewAt;
  private String reviewStage;
}
