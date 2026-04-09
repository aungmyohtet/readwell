package com.grammar.backend.dto;

import java.time.Instant;
import lombok.Data;

@Data
public class PlacementResponse {
  private String recommendedLevel;
  private String chosenLevel;
  private String confidenceBand;
  private Instant completedAt;
  private Instant updatedAt;
}