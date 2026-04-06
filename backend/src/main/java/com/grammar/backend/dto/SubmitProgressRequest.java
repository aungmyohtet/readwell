package com.grammar.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SubmitProgressRequest {
  @NotBlank private String storyId;
  @NotBlank private String chapterId;

  @Min(0)
  private int score;

  @Min(1)
  private int totalQuestions;
}
