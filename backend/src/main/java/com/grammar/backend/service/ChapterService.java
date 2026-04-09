package com.grammar.backend.service;

import com.grammar.backend.dto.ChapterDetailResponse;
import com.grammar.backend.dto.ChapterSummaryResponse;
import com.grammar.backend.model.Chapter;
import com.grammar.backend.model.UserProgress;
import com.grammar.backend.repository.ChapterRepository;
import com.grammar.backend.repository.UserProgressRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ChapterService {

  private final ChapterRepository chapterRepository;
  private final UserProgressRepository progressRepository;

  public ChapterService(
      ChapterRepository chapterRepository, UserProgressRepository progressRepository) {
    this.chapterRepository = chapterRepository;
    this.progressRepository = progressRepository;
  }

  public List<ChapterSummaryResponse> getChapters(String storyId, String userId) {
    List<Chapter> chapters =
        chapterRepository.findByStoryIdOrderByChapterNumberAsc(storyId);

    Map<String, UserProgress> progressMap =
        progressRepository.findByUserIdAndStoryId(userId, storyId).stream()
            .collect(Collectors.toMap(UserProgress::getChapterId, p -> p));

    return chapters.stream()
        .map(c -> toSummary(c, progressMap.get(c.getId())))
        .toList();
  }

  public Optional<ChapterDetailResponse> getChapter(String chapterId, String userId) {
    return chapterRepository
        .findById(chapterId)
        .map(
            c -> {
              Optional<UserProgress> progress =
                  progressRepository.findByUserIdAndChapterId(userId, chapterId);
              return toDetail(c, progress.orElse(null));
            });
  }

  private ChapterSummaryResponse toSummary(Chapter c, UserProgress progress) {
    ChapterSummaryResponse r = new ChapterSummaryResponse();
    r.setId(c.getId());
    r.setStoryId(c.getStoryId());
    r.setChapterNumber(c.getChapterNumber());
    r.setTitle(c.getTitle());
    r.setVocabularyCount(c.getVocabulary() != null ? c.getVocabulary().size() : 0);
    r.setComprehensionCount(c.getComprehension() != null ? c.getComprehension().size() : 0);
    if (progress != null) {
      r.setCompleted(true);
      r.setScore(progress.getScore());
      r.setBestScore(bestScoreOrLegacy(progress));
      r.setPreviousScore(progress.getPreviousScore());
      r.setAttemptCount(attemptCountOrLegacy(progress));
      r.setNextReviewAt(progress.getNextReviewAt());
      r.setReviewStage(progress.getReviewStage());
      r.setMasteryState(masteryState(progress));
    } else {
      r.setMasteryState("not_started");
    }
    return r;
  }

  private ChapterDetailResponse toDetail(Chapter c, UserProgress progress) {
    ChapterDetailResponse r = new ChapterDetailResponse();
    r.setId(c.getId());
    r.setStoryId(c.getStoryId());
    r.setChapterNumber(c.getChapterNumber());
    r.setTitle(c.getTitle());
    r.setVocabulary(c.getVocabulary());
    r.setGrammarFocus(c.getGrammarFocus());
    r.setGrammarPractice(c.getGrammarPractice());
    r.setContent(c.getContent());
    r.setComprehension(c.getComprehension());
    if (progress != null) {
      r.setCompleted(true);
      r.setScore(progress.getScore());
      r.setBestScore(bestScoreOrLegacy(progress));
      r.setPreviousScore(progress.getPreviousScore());
      r.setAttemptCount(attemptCountOrLegacy(progress));
      r.setNextReviewAt(progress.getNextReviewAt());
      r.setReviewStage(progress.getReviewStage());
      r.setMasteryState(masteryState(progress));
    } else {
      r.setMasteryState("not_started");
    }
    return r;
  }

  private String masteryState(UserProgress progress) {
    String reviewStage = storedOrDerivedReviewStage(progress);
    int effectivePct = effectiveScorePct(progress);

    if ("rescue".equals(reviewStage) || "due-now".equals(reviewStage)) {
      return "needs_review";
    }
    if (effectivePct >= 90) {
      return "mastered";
    }
    return "stabilising";
  }

  private String storedOrDerivedReviewStage(UserProgress progress) {
    if (progress.getReviewStage() != null && !progress.getReviewStage().isBlank()) {
      return progress.getReviewStage();
    }
    return effectiveScorePct(progress) < 60 ? "rescue" : effectiveScorePct(progress) < 80 ? "due-now" : "due-soon";
  }

  private int effectiveScorePct(UserProgress progress) {
    int totalQuestions = Math.max(0, progress.getTotalQuestions());
    int practiceTotal = Math.max(0, progress.getPracticeTotal());
    int combinedTotal = totalQuestions + practiceTotal;
    if (combinedTotal <= 0) {
      return 0;
    }

    int combinedCorrect = Math.max(0, progress.getScore()) + Math.max(0, progress.getPracticeScore());
    return Math.round((combinedCorrect * 100f) / combinedTotal);
  }

  private int attemptCountOrLegacy(UserProgress progress) {
    if (progress.getAttemptCount() > 0) {
      return progress.getAttemptCount();
    }
    return progress.getCompletedAt() != null ? 1 : 0;
  }

  private int bestScoreOrLegacy(UserProgress progress) {
    if (progress.getBestScore() > 0 || attemptCountOrLegacy(progress) > 1) {
      return progress.getBestScore();
    }
    return progress.getCompletedAt() != null ? progress.getScore() : 0;
  }
}
