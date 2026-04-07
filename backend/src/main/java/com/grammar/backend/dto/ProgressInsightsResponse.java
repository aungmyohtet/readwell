package com.grammar.backend.dto;

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
    private int chapterCount;
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
    private String reason;
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
    private String question;
    private String selectedAnswer;
    private String correctAnswer;
    private String explanation;
    private String completedAt;
  }
}