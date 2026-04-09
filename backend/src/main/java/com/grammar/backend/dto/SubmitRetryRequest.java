package com.grammar.backend.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Data;

@Data
public class SubmitRetryRequest {
  @NotBlank private String storyId;
  @NotBlank private String chapterId;

  private List<SubmitProgressRequest.QuestionAttemptRequest> questionAttempts;
  private List<SubmitProgressRequest.GrammarPracticeAttemptRequest> grammarPracticeAttempts;
}