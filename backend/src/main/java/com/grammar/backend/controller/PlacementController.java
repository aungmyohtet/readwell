package com.grammar.backend.controller;

import com.grammar.backend.dto.PlacementResponse;
import com.grammar.backend.dto.SubmitPlacementRequest;
import com.grammar.backend.dto.UpdatePlacementChoiceRequest;
import com.grammar.backend.service.PlacementService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/placement")
public class PlacementController {

  private final PlacementService placementService;

  public PlacementController(PlacementService placementService) {
    this.placementService = placementService;
  }

  @GetMapping
  public ResponseEntity<PlacementResponse> getPlacement(Authentication auth) {
    String userId = (String) auth.getPrincipal();
    return placementService.getPlacement(userId).map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
  }

  @PostMapping
  public PlacementResponse submitPlacement(@Valid @RequestBody SubmitPlacementRequest request, Authentication auth) {
    String userId = (String) auth.getPrincipal();
    return placementService.submitPlacement(userId, request);
  }

  @PutMapping("/choice")
  public ResponseEntity<PlacementResponse> updateChoice(
      @Valid @RequestBody UpdatePlacementChoiceRequest request, Authentication auth) {
    String userId = (String) auth.getPrincipal();
    return placementService.updateChoice(userId, request).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
  }
}