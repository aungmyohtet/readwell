package com.grammar.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Data;

@Data
public class SubmitProgressRequest {
  @NotBlank private String storyId;
  @NotBlank private String chapterId;

  @Min(0)
  private int score;

  @Min(1)
  private int totalQuestions;

  private List<QuestionAttemptRequest> questionAttempts;

  @Data
  public static class QuestionAttemptRequest {
    @Min(1)
    private int questionOrder;

    private String selectedAnswer;
  }
}
