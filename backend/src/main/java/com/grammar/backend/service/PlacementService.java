package com.grammar.backend.service;

import com.grammar.backend.dto.PlacementResponse;
import com.grammar.backend.dto.SubmitPlacementRequest;
import com.grammar.backend.dto.UpdatePlacementChoiceRequest;
import com.grammar.backend.model.PlacementProfile;
import com.grammar.backend.repository.PlacementProfileRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class PlacementService {

  private final PlacementProfileRepository placementProfileRepository;

  public PlacementService(PlacementProfileRepository placementProfileRepository) {
    this.placementProfileRepository = placementProfileRepository;
  }

  public Optional<PlacementResponse> getPlacement(String userId) {
    return placementProfileRepository.findByUserId(userId).map(this::toResponse);
  }

  public PlacementResponse submitPlacement(String userId, SubmitPlacementRequest request) {
    PlacementProfile profile = placementProfileRepository.findByUserId(userId).orElseGet(PlacementProfile::new);
    Instant now = Instant.now();
    String recommendedLevel = recommendLevel(request);

    profile.setUserId(userId);
    profile.setReadingComfort(normalizeBand(request.getReadingComfort()));
    profile.setGrammarConfidence(normalizeBand(request.getGrammarConfidence()));
    profile.setVocabularyIndependence(normalizeBand(request.getVocabularyIndependence()));
    profile.setChallengePreference(normalizeBand(request.getChallengePreference()));
    profile.setRecommendedLevel(recommendedLevel);
    profile.setChosenLevel(recommendedLevel);
    profile.setConfidenceBand(confidenceBand(request, recommendedLevel));
    profile.setUpdatedAt(now);
    profile.setCompletedAt(now);

    return toResponse(placementProfileRepository.save(profile));
  }

  public Optional<PlacementResponse> updateChoice(String userId, UpdatePlacementChoiceRequest request) {
    return placementProfileRepository.findByUserId(userId).map(profile -> {
      profile.setChosenLevel(normalizeLevel(request.getChosenLevel()));
      profile.setUpdatedAt(Instant.now());
      return toResponse(placementProfileRepository.save(profile));
    });
  }

  private PlacementResponse toResponse(PlacementProfile profile) {
    PlacementResponse response = new PlacementResponse();
    response.setRecommendedLevel(profile.getRecommendedLevel());
    response.setChosenLevel(profile.getChosenLevel());
    response.setConfidenceBand(profile.getConfidenceBand());
    response.setCompletedAt(profile.getCompletedAt());
    response.setUpdatedAt(profile.getUpdatedAt());
    return response;
  }

  private String recommendLevel(SubmitPlacementRequest request) {
    Map<String, Integer> scores = scoreMap(request);
    String bestLevel = "A2";
    int bestScore = -1;

    for (String level : new String[] {"A2", "B1", "B2"}) {
      int score = scores.getOrDefault(level, 0);
      if (score > bestScore) {
        bestScore = score;
        bestLevel = level;
      }
    }

    return bestLevel;
  }

  private String confidenceBand(SubmitPlacementRequest request, String recommendedLevel) {
    Map<String, Integer> scores = scoreMap(request);
    int recommendedScore = scores.getOrDefault(recommendedLevel, 0);
    long sameTopCount = scores.values().stream().filter(score -> score == recommendedScore).count();

    if (sameTopCount > 1) {
      return "mixed";
    }
    if (recommendedScore >= 3) {
      return "clear";
    }
    return "leaning";
  }

  private Map<String, Integer> scoreMap(SubmitPlacementRequest request) {
    Map<String, Integer> scores = new LinkedHashMap<>();
    scores.put("A2", 0);
    scores.put("B1", 0);
    scores.put("B2", 0);

    increment(scores, normalizeLevel(request.getReadingComfort()));
    increment(scores, normalizeLevel(request.getGrammarConfidence()));
    increment(scores, normalizeLevel(request.getVocabularyIndependence()));
    increment(scores, normalizeLevel(request.getChallengePreference()));
    return scores;
  }

  private void increment(Map<String, Integer> scores, String level) {
    scores.computeIfPresent(level, (_key, value) -> value + 1);
  }

  private String normalizeBand(String value) {
    return normalizeLevel(value);
  }

  private String normalizeLevel(String value) {
    if (value == null) {
      return "A2";
    }
    String upper = value.trim().toUpperCase(Locale.ROOT);
    return switch (upper) {
      case "A2", "B1", "B2" -> upper;
      default -> "A2";
    };
  }
}