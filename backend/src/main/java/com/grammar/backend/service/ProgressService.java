package com.grammar.backend.service;

import com.grammar.backend.dto.ProgressResponse;
import com.grammar.backend.dto.SubmitProgressRequest;
import com.grammar.backend.model.Chapter;
import com.grammar.backend.model.Story;
import com.grammar.backend.model.UserProgress;
import com.grammar.backend.repository.ChapterRepository;
import com.grammar.backend.repository.StoryRepository;
import com.grammar.backend.repository.UserProgressRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ProgressService {

  private final UserProgressRepository progressRepository;
  private final StoryRepository storyRepository;
  private final ChapterRepository chapterRepository;

  public ProgressService(
      UserProgressRepository progressRepository,
      StoryRepository storyRepository,
      ChapterRepository chapterRepository) {
    this.progressRepository = progressRepository;
    this.storyRepository = storyRepository;
    this.chapterRepository = chapterRepository;
  }

  public ProgressResponse submit(String userId, SubmitProgressRequest req) {
    Optional<UserProgress> existing =
        progressRepository.findByUserIdAndChapterId(userId, req.getChapterId());

    UserProgress progress = existing.orElse(new UserProgress());
    progress.setUserId(userId);
    progress.setStoryId(req.getStoryId());
    progress.setChapterId(req.getChapterId());
    progress.setScore(req.getScore());
    progress.setTotalQuestions(req.getTotalQuestions());
    progress.setCompletedAt(Instant.now());

    UserProgress saved = progressRepository.save(progress);
    return toResponse(saved);
  }

  public List<ProgressResponse> getHistory(String userId) {
    return progressRepository.findByUserIdOrderByCompletedAtDesc(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  private ProgressResponse toResponse(UserProgress p) {
    ProgressResponse r = new ProgressResponse();
    r.setId(p.getId());
    r.setUserId(p.getUserId());
    r.setStoryId(p.getStoryId());
    r.setChapterId(p.getChapterId());
    r.setScore(p.getScore());
    r.setTotalQuestions(p.getTotalQuestions());
    r.setCompletedAt(p.getCompletedAt());

    storyRepository.findById(p.getStoryId()).map(Story::getTitle).ifPresent(r::setStoryTitle);
    chapterRepository
        .findById(p.getChapterId())
        .ifPresent(
            c -> {
              r.setChapterTitle(c.getTitle());
              r.setChapterNumber(c.getChapterNumber());
            });

    return r;
  }
}
