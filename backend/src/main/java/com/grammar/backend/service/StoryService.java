package com.grammar.backend.service;

import com.grammar.backend.dto.StorySummaryResponse;
import com.grammar.backend.model.Chapter;
import com.grammar.backend.model.Story;
import com.grammar.backend.repository.ChapterRepository;
import com.grammar.backend.repository.StoryRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class StoryService {

  private final StoryRepository storyRepository;
  private final ChapterRepository chapterRepository;

  public StoryService(StoryRepository storyRepository, ChapterRepository chapterRepository) {
    this.storyRepository = storyRepository;
    this.chapterRepository = chapterRepository;
  }

  public List<StorySummaryResponse> getStories(String level) {
    List<Story> stories =
        (level != null && !level.isBlank())
            ? storyRepository.findByLevel(level.toUpperCase())
            : storyRepository.findAll();
    return stories.stream().map(this::toSummary).toList();
  }

  public Optional<StorySummaryResponse> getStory(String id) {
    return storyRepository.findById(id).map(this::toSummary);
  }

  private StorySummaryResponse toSummary(Story s) {
    StorySummaryResponse r = new StorySummaryResponse();
    r.setId(s.getId());
    r.setTitle(s.getTitle());
    r.setDescription(s.getDescription());
    r.setLevel(s.getLevel());
    r.setCoverEmoji(s.getCoverEmoji());
    r.setCoverImageUrl(s.getCoverImageUrl());
    r.setAuthor(s.getAuthor());
    r.setTags(s.getTags());
    r.setGrammarRules(grammarRulesForStory(s.getId()));
    r.setTotalChapters(s.getTotalChapters());
    return r;
  }

  private List<String> grammarRulesForStory(String storyId) {
    return chapterRepository.findByStoryIdOrderByChapterNumberAsc(storyId).stream()
        .map(Chapter::getGrammarFocus)
        .filter(grammarFocus -> grammarFocus != null && grammarFocus.getRule() != null)
        .map(Chapter.GrammarFocus::getRule)
        .map(String::trim)
        .filter(rule -> !rule.isBlank())
        .collect(java.util.stream.Collectors.collectingAndThen(
            java.util.stream.Collectors.toCollection(LinkedHashSet::new),
            List::copyOf));
  }
}
