package com.grammar.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SubmitPlacementRequest {
  @NotBlank private String readingComfort;
  @NotBlank private String grammarConfidence;
  @NotBlank private String vocabularyIndependence;
  @NotBlank private String challengePreference;
}