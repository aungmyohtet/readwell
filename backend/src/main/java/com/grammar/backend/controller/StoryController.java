package com.grammar.backend.controller;

import com.grammar.backend.dto.ChapterDetailResponse;
import com.grammar.backend.dto.ChapterSummaryResponse;
import com.grammar.backend.dto.StorySummaryResponse;
import com.grammar.backend.service.ChapterService;
import com.grammar.backend.service.StoryService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

  private final StoryService storyService;
  private final ChapterService chapterService;

  public StoryController(StoryService storyService, ChapterService chapterService) {
    this.storyService = storyService;
    this.chapterService = chapterService;
  }

  @GetMapping
  public List<StorySummaryResponse> getStories(@RequestParam(required = false) String level) {
    return storyService.getStories(level);
  }

  @GetMapping("/{id}")
  public ResponseEntity<StorySummaryResponse> getStory(@PathVariable String id) {
    return storyService.getStory(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/{storyId}/chapters")
  public List<ChapterSummaryResponse> getChapters(
      @PathVariable String storyId, Authentication auth) {
    String userId = (String) auth.getPrincipal();
    return chapterService.getChapters(storyId, userId);
  }

  @GetMapping("/chapters/{chapterId}")
  public ResponseEntity<ChapterDetailResponse> getChapter(
      @PathVariable String chapterId, Authentication auth) {
    String userId = (String) auth.getPrincipal();
    return chapterService
        .getChapter(chapterId, userId)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }
}
