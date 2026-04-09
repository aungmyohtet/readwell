package com.grammar.backend.model;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "placement_profiles")
@CompoundIndex(name = "placement_user_idx", def = "{'userId': 1}", unique = true)
public class PlacementProfile {

  @Id private String id;

  private String userId;

  private String readingComfort;

  private String grammarConfidence;

  private String vocabularyIndependence;

  private String challengePreference;

  private String recommendedLevel;

  private String chosenLevel;

  private String confidenceBand;

  private Instant completedAt;

  private Instant updatedAt;
}