package com.grammar.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePlacementChoiceRequest {
  @NotBlank private String chosenLevel;
}