package com.grammar.backend.dto;

import java.util.List;
import lombok.Data;

@Data
public class RetrySessionResponse {
  private String storyId;
  private String storyTitle;
  private String chapterId;
  private String chapterTitle;
  private int chapterNumber;
  private String grammarRule;
  private List<RetryQuizItem> quizItems;
  private List<RetryPracticeItem> practiceItems;

  @Data
  public static class RetryQuizItem {
    private int order;
    private String question;
    private List<String> options;
    private String previousAnswer;
    private String correctAnswer;
    private String explanation;
  }

  @Data
  public static class RetryPracticeItem {
    private int order;
    private String type;
    private String prompt;
    private List<String> options;
    private String previousAnswer;
    private String correctAnswer;
    private String explanation;
    private String skillTag;
  }
}