package com.grammar.backend.dto;

import java.time.Instant;
import lombok.Data;

@Data
public class ChapterSummaryResponse {
  private String id;
  private String storyId;
  private int chapterNumber;
  private String title;
  private int vocabularyCount;
  private int comprehensionCount;
  private boolean completed;
  private int score;
  private int bestScore;
  private Integer previousScore;
  private int attemptCount;
  private Instant nextReviewAt;
  private String reviewStage;
}
