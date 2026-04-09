package com.grammar.backend.dto;

import java.time.Instant;
import java.util.List;
import lombok.Data;

@Data
public class ProgressInsightsResponse {
  private int averageScorePct;
  private List<GrammarWeakness> weakAreas;
  private List<ReviewRecommendation> reviewQueue;
  private List<MistakeBankItem> mistakeBank;

  @Data
  public static class GrammarWeakness {
    private String grammarRule;
    private int missCount;
    private int quizMissCount;
    private int practiceMissCount;
    private int chapterCount;
    private String focusSkillTag;
    private String focusSkillLabel;
    private int focusSkillMissCount;
  }

  @Data
  public static class ReviewRecommendation {
    private String storyId;
    private String storyTitle;
    private String chapterId;
    private String chapterTitle;
    private int chapterNumber;
    private String grammarRule;
    private int lastScorePct;
    private Instant nextReviewAt;
    private String reviewStage;
    private String reason;
    private String focusSkillTag;
    private String focusSkillLabel;
  }

  @Data
  public static class MistakeBankItem {
    private String storyId;
    private String storyTitle;
    private String chapterId;
    private String chapterTitle;
    private int chapterNumber;
    private String grammarRule;
    private int questionOrder;
    private String source;
    private String skillTag;
    private String skillLabel;
    private String question;
    private String selectedAnswer;
    private String correctAnswer;
    private String explanation;
    private String completedAt;
  }
}