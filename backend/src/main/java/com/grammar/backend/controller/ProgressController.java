package com.grammar.backend.controller;

import com.grammar.backend.dto.ProgressResponse;
import com.grammar.backend.dto.SubmitProgressRequest;
import com.grammar.backend.service.ProgressService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {

  private final ProgressService progressService;

  public ProgressController(ProgressService progressService) {
    this.progressService = progressService;
  }

  @PostMapping
  public ProgressResponse submit(
      @Valid @RequestBody SubmitProgressRequest request, Authentication auth) {
    String userId = (String) auth.getPrincipal();
    return progressService.submit(userId, request);
  }

  @GetMapping("/history")
  public List<ProgressResponse> getHistory(Authentication auth) {
    String userId = (String) auth.getPrincipal();
    return progressService.getHistory(userId);
  }
}
